import { Router } from 'express';
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import SessionService from '../services/session.service';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/session/status:
 *   get:
 *     summary: Check session status
 *     description: Check if user has an active session across applications
 *     tags: [Session]
 *     responses:
 *       200:
 *         description: Session status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                     user:
 *                       type: object
 *                     sessionInfo:
 *                       type: object
 */
router.get('/status', 
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const sessionInfo = SessionService.getUserSessionFromCookie(req);
    const isAuthenticated = !!(req as any).user || !!sessionInfo;

    ResponseUtil.success(res, {
      authenticated: isAuthenticated,
      user: (req as any).user || sessionInfo?.user,
      sessionInfo: sessionInfo,
    });
  })
);

/**
 * @swagger
 * /api/session/refresh:
 *   post:
 *     summary: Refresh session
 *     description: Refresh user session using refresh token from cookies
 *     tags: [Session]
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = SessionService.getTokensFromCookies(req);

    if (!refreshToken) {
      return ResponseUtil.unauthorized(res, 'No refresh token found');
    }

    try {
      const result = await SessionService.refreshSession(refreshToken);
      
      if (result.error) {
        SessionService.clearAuthCookies(res);
        return ResponseUtil.unauthorized(res, 'Invalid refresh token');
      }

      // Set new cookies
      SessionService.setAuthCookies(
        res, 
        result.accessToken!, 
        result.refreshToken!, 
        result.user
      );

      ResponseUtil.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      SessionService.clearAuthCookies(res);
      ResponseUtil.unauthorized(res, 'Session refresh failed');
    }
  })
);

/**
 * @swagger
 * /api/session/clear:
 *   post:
 *     summary: Clear session
 *     description: Clear session cookies (logout from all applications)
 *     tags: [Session]
 *     responses:
 *       200:
 *         description: Session cleared successfully
 */
router.post('/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { accessToken } = SessionService.getTokensFromCookies(req);
    
    if (accessToken) {
      await SessionService.invalidateUserSession(accessToken);
    }
    
    SessionService.clearAuthCookies(res);
    
    ResponseUtil.success(res, {
      message: 'Session cleared successfully'
    });
  })
);

export default router;