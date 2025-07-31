import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { logger } from '../middleware/logger';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

export interface DomainVerificationRecord {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  value: string;
  status: 'pending' | 'verified' | 'failed';
  error?: string;
}

export interface DomainVerificationResult {
  domain: string;
  verified: boolean;
  ssl_status: 'pending' | 'active' | 'failed';
  records: DomainVerificationRecord[];
  verification_token: string;
  last_checked: string;
  next_check: string;
}

export interface SSLCertificateInfo {
  issued_to: string;
  issued_by: string;
  valid_from: string;
  valid_to: string;
  status: 'valid' | 'expired' | 'invalid';
}

export class DomainVerificationService {
  private readonly VERIFICATION_TOKEN_PREFIX = 'storyslip-verification=';
  private readonly STORYSLIP_IP = '192.0.2.1'; // Example IP - replace with actual
  private readonly STORYSLIP_CNAME = 'proxy.storyslip.com';

  /**
   * Generate verification records for a domain
   */
  generateVerificationRecords(domain: string, websiteId: string): DomainVerificationRecord[] {
    const verificationToken = this.generateVerificationToken(websiteId);
    
    return [
      {
        type: 'CNAME',
        name: domain,
        value: this.STORYSLIP_CNAME,
        status: 'pending',
      },
      {
        type: 'TXT',
        name: `_storyslip-verification.${domain}`,
        value: `${this.VERIFICATION_TOKEN_PREFIX}${verificationToken}`,
        status: 'pending',
      },
      {
        type: 'A',
        name: domain,
        value: this.STORYSLIP_IP,
        status: 'pending',
      },
    ];
  }

  /**
   * Verify domain configuration
   */
  async verifyDomain(websiteId: string, domain: string): Promise<DomainVerificationResult> {
    try {
      const verificationToken = this.generateVerificationToken(websiteId);
      const records = this.generateVerificationRecords(domain, websiteId);
      
      // Verify each DNS record
      const verifiedRecords = await Promise.all(
        records.map(record => this.verifyDNSRecord(record, verificationToken))
      );

      // Check if domain is verified (at least one record type must be verified)
      const cnameVerified = verifiedRecords.find(r => r.type === 'CNAME')?.status === 'verified';
      const aRecordVerified = verifiedRecords.find(r => r.type === 'A')?.status === 'verified';
      const txtVerified = verifiedRecords.find(r => r.type === 'TXT')?.status === 'verified';
      
      const domainVerified = (cnameVerified || aRecordVerified) && txtVerified;

      // Check SSL status if domain is verified
      let sslStatus: 'pending' | 'active' | 'failed' = 'pending';
      if (domainVerified) {
        sslStatus = await this.checkSSLStatus(domain);
      }

      const result: DomainVerificationResult = {
        domain,
        verified: domainVerified,
        ssl_status: sslStatus,
        records: verifiedRecords,
        verification_token: verificationToken,
        last_checked: new Date().toISOString(),
        next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      };

      // Update database with verification result
      await this.updateDomainVerificationStatus(websiteId, result);

      return result;
    } catch (error) {
      logger.error(`Domain verification failed for ${domain}:`, error);
      throw new ApiError('Domain verification failed', 500, 'DOMAIN_VERIFICATION_ERROR', error);
    }
  }

  /**
   * Get SSL certificate information
   */
  async getSSLCertificateInfo(domain: string): Promise<SSLCertificateInfo | null> {
    try {
      // In a real implementation, this would use a library like 'tls' or make HTTPS requests
      // to check the SSL certificate. For now, we'll simulate it.
      
      const https = require('https');
      const { promisify } = require('util');
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: domain,
          port: 443,
          method: 'HEAD',
          timeout: 10000,
        };

        const req = https.request(options, (res: any) => {
          const cert = res.connection.getPeerCertificate();
          
          if (cert && cert.subject) {
            const certInfo: SSLCertificateInfo = {
              issued_to: cert.subject.CN || domain,
              issued_by: cert.issuer.CN || 'Unknown',
              valid_from: cert.valid_from,
              valid_to: cert.valid_to,
              status: new Date(cert.valid_to) > new Date() ? 'valid' : 'expired',
            };
            resolve(certInfo);
          } else {
            resolve(null);
          }
        });

        req.on('error', () => {
          resolve(null);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });

        req.end();
      });
    } catch (error) {
      logger.error(`Failed to get SSL certificate info for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Schedule domain re-verification
   */
  async scheduleDomainReVerification(websiteId: string, domain: string, delayMinutes: number = 5): Promise<void> {
    try {
      // In a real implementation, this would use a job queue like Bull or Agenda
      // For now, we'll just log the scheduling
      logger.info(`Scheduled domain re-verification for ${domain} in ${delayMinutes} minutes`);
      
      // Store the scheduled verification in the database
      await supabase
        .from('domain_verification_queue')
        .upsert({
          website_id: websiteId,
          domain,
          scheduled_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
          status: 'scheduled',
        });
    } catch (error) {
      logger.error(`Failed to schedule domain re-verification for ${domain}:`, error);
    }
  }

  /**
   * Process domain verification queue
   */
  async processDomainVerificationQueue(): Promise<void> {
    try {
      const { data: queueItems, error } = await supabase
        .from('domain_verification_queue')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())
        .limit(10);

      if (error) {
        throw error;
      }

      for (const item of queueItems || []) {
        try {
          await this.verifyDomain(item.website_id, item.domain);
          
          // Mark as processed
          await supabase
            .from('domain_verification_queue')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('id', item.id);
        } catch (error) {
          logger.error(`Failed to process domain verification for ${item.domain}:`, error);
          
          // Mark as failed
          await supabase
            .from('domain_verification_queue')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }
    } catch (error) {
      logger.error('Failed to process domain verification queue:', error);
    }
  }

  /**
   * Private helper methods
   */
  private generateVerificationToken(websiteId: string): string {
    // Generate a deterministic token based on website ID and a secret
    const crypto = require('crypto');
    const secret = process.env.DOMAIN_VERIFICATION_SECRET || 'default-secret';
    return crypto.createHmac('sha256', secret).update(websiteId).digest('hex').substring(0, 32);
  }

  private async verifyDNSRecord(
    record: DomainVerificationRecord,
    verificationToken: string
  ): Promise<DomainVerificationRecord> {
    try {
      switch (record.type) {
        case 'CNAME':
          return await this.verifyCNAMERecord(record);
        case 'A':
          return await this.verifyARecord(record);
        case 'TXT':
          return await this.verifyTXTRecord(record, verificationToken);
        default:
          return { ...record, status: 'failed', error: 'Unsupported record type' };
      }
    } catch (error) {
      return {
        ...record,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  private async verifyCNAMERecord(record: DomainVerificationRecord): Promise<DomainVerificationRecord> {
    try {
      const results = await resolveCname(record.name);
      const verified = results.some(result => result === record.value);
      
      return {
        ...record,
        status: verified ? 'verified' : 'failed',
        error: verified ? undefined : `Expected CNAME ${record.value}, found: ${results.join(', ')}`,
      };
    } catch (error) {
      return {
        ...record,
        status: 'failed',
        error: `CNAME lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async verifyARecord(record: DomainVerificationRecord): Promise<DomainVerificationRecord> {
    try {
      const results = await resolve4(record.name);
      const verified = results.includes(record.value);
      
      return {
        ...record,
        status: verified ? 'verified' : 'failed',
        error: verified ? undefined : `Expected A record ${record.value}, found: ${results.join(', ')}`,
      };
    } catch (error) {
      return {
        ...record,
        status: 'failed',
        error: `A record lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async verifyTXTRecord(
    record: DomainVerificationRecord,
    verificationToken: string
  ): Promise<DomainVerificationRecord> {
    try {
      const results = await resolveTxt(record.name);
      const flatResults = results.flat();
      const expectedValue = `${this.VERIFICATION_TOKEN_PREFIX}${verificationToken}`;
      const verified = flatResults.some(result => result === expectedValue);
      
      return {
        ...record,
        status: verified ? 'verified' : 'failed',
        error: verified ? undefined : `Expected TXT record ${expectedValue}, found: ${flatResults.join(', ')}`,
      };
    } catch (error) {
      return {
        ...record,
        status: 'failed',
        error: `TXT record lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async checkSSLStatus(domain: string): Promise<'pending' | 'active' | 'failed'> {
    try {
      const certInfo = await this.getSSLCertificateInfo(domain);
      
      if (!certInfo) {
        return 'failed';
      }
      
      return certInfo.status === 'valid' ? 'active' : 'failed';
    } catch (error) {
      logger.error(`SSL status check failed for ${domain}:`, error);
      return 'failed';
    }
  }

  private async updateDomainVerificationStatus(
    websiteId: string,
    result: DomainVerificationResult
  ): Promise<void> {
    try {
      await supabase
        .from('brand_configurations')
        .update({
          domain_verified: result.verified,
          ssl_enabled: result.ssl_status === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('website_id', websiteId);

      // Store detailed verification result
      await supabase
        .from('domain_verification_results')
        .upsert({
          website_id: websiteId,
          domain: result.domain,
          verified: result.verified,
          ssl_status: result.ssl_status,
          records: result.records,
          verification_token: result.verification_token,
          last_checked: result.last_checked,
          next_check: result.next_check,
        });
    } catch (error) {
      logger.error('Failed to update domain verification status:', error);
    }
  }
}

export const domainVerificationService = new DomainVerificationService();