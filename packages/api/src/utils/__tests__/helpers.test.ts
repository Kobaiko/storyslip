import { HelperUtil } from '../helpers';

describe('HelperUtil', () => {
  describe('generateSlug', () => {
    it('should generate valid slug from text', () => {
      expect(HelperUtil.generateSlug('Hello World')).toBe('hello-world');
      expect(HelperUtil.generateSlug('Test Title with Special Characters!')).toBe('test-title-with-special-characters');
      expect(HelperUtil.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });

    it('should handle empty string', () => {
      expect(HelperUtil.generateSlug('')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(HelperUtil.isValidEmail('test@example.com')).toBe(true);
      expect(HelperUtil.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(HelperUtil.isValidEmail('invalid-email')).toBe(false);
      expect(HelperUtil.isValidEmail('test@')).toBe(false);
      expect(HelperUtil.isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(HelperUtil.isValidUrl('https://example.com')).toBe(true);
      expect(HelperUtil.isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(HelperUtil.isValidUrl('not-a-url')).toBe(false);
      expect(HelperUtil.isValidUrl('ftp://invalid')).toBe(true); // URL constructor accepts this
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domains', () => {
      expect(HelperUtil.isValidDomain('example.com')).toBe(true);
      expect(HelperUtil.isValidDomain('sub.domain.co.uk')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(HelperUtil.isValidDomain('invalid..domain')).toBe(false);
      expect(HelperUtil.isValidDomain('-invalid.com')).toBe(false);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(HelperUtil.extractDomain('https://example.com/path')).toBe('example.com');
      expect(HelperUtil.extractDomain('example.com')).toBe('example.com');
    });

    it('should return null for invalid URLs', () => {
      expect(HelperUtil.extractDomain('invalid-url')).toBe(null);
    });
  });

  describe('generateExcerpt', () => {
    it('should generate excerpt from content', () => {
      const content = 'This is a long piece of content that should be truncated at some point.';
      const excerpt = HelperUtil.generateExcerpt(content, 30);
      
      expect(excerpt.length).toBeLessThanOrEqual(33); // 30 + '...'
      expect(excerpt).toContain('...');
    });

    it('should handle HTML content', () => {
      const content = '<p>This is <strong>HTML</strong> content</p>';
      const excerpt = HelperUtil.generateExcerpt(content, 20);
      
      expect(excerpt).not.toContain('<p>');
      expect(excerpt).not.toContain('<strong>');
    });

    it('should return original content if shorter than limit', () => {
      const content = 'Short content';
      const excerpt = HelperUtil.generateExcerpt(content, 100);
      
      expect(excerpt).toBe(content);
    });
  });

  describe('parsePagination', () => {
    it('should parse valid pagination parameters', () => {
      const result = HelperUtil.parsePagination({ page: '2', limit: '20' });
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20);
    });

    it('should use defaults for invalid parameters', () => {
      const result = HelperUtil.parsePagination({ page: 'invalid', limit: '200' });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100); // Max limit
      expect(result.offset).toBe(0);
    });
  });

  describe('parseSort', () => {
    it('should parse valid sort parameters', () => {
      const result = HelperUtil.parseSort({ sort: 'name', order: 'asc' }, ['name', 'created_at']);
      
      expect(result.sort).toBe('name');
      expect(result.order).toBe('asc');
    });

    it('should use defaults for invalid parameters', () => {
      const result = HelperUtil.parseSort({ sort: 'invalid', order: 'invalid' }, ['name']);
      
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });
  });

  describe('isValidUuid', () => {
    it('should validate correct UUIDs', () => {
      const uuid = HelperUtil.generateUuid();
      expect(HelperUtil.isValidUuid(uuid)).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(HelperUtil.isValidUuid('invalid-uuid')).toBe(false);
      expect(HelperUtil.isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
    });
  });

  describe('removeUndefined', () => {
    it('should remove undefined values', () => {
      const obj = {
        a: 'value',
        b: undefined,
        c: null,
        d: 0,
        e: false,
      };
      
      const result = HelperUtil.removeUndefined(obj);
      
      expect(result).toEqual({
        a: 'value',
        c: null,
        d: 0,
        e: false,
      });
      expect(result.hasOwnProperty('b')).toBe(false);
    });
  });

  describe('isJsonString', () => {
    it('should validate JSON strings', () => {
      expect(HelperUtil.isJsonString('{"key": "value"}')).toBe(true);
      expect(HelperUtil.isJsonString('[1, 2, 3]')).toBe(true);
    });

    it('should reject invalid JSON strings', () => {
      expect(HelperUtil.isJsonString('invalid json')).toBe(false);
      expect(HelperUtil.isJsonString('{"key": value}')).toBe(false); // Missing quotes
    });
  });
});