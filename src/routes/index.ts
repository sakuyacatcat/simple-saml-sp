import { Router, Request, Response } from 'express';
import * as samlify from 'samlify';
import xmlFormatter from 'xml-formatter';
import type { Config } from '../config.js';
import { extractIdpInfo } from '../saml/idp.js';

const format = xmlFormatter.default || xmlFormatter;

// Extend session type
declare module 'express-session' {
  interface SessionData {
    user?: {
      nameId: string;
      attributes: Record<string, string | string[]>;
      sessionIndex?: string;
    };
    samlResponse?: string;
    loginTime?: string;
  }
}

interface RouterContext {
  config: Config;
  sp: samlify.ServiceProviderInstance;
  idp: samlify.IdentityProviderInstance;
}

export function createRoutes(ctx: RouterContext): Router {
  const router = Router();
  const { config, sp, idp } = ctx;

  // Home page
  router.get('/', (req: Request, res: Response) => {
    const idpInfo = extractIdpInfo(idp);
    res.render('index', {
      authenticated: !!req.session.user,
      user: req.session.user,
      config,
      sp: {
        entityId: config.sp.entityId,
        acsUrl: `${config.server.baseUrl}/acs`,
        metadataUrl: `${config.server.baseUrl}/metadata`,
      },
      idp: idpInfo,
    });
  });

  // SP Metadata
  router.get('/metadata', (_req: Request, res: Response) => {
    res.type('application/xml');
    res.send(sp.getMetadata());
  });

  // Login - redirect to IdP
  router.get('/login', (_req: Request, res: Response) => {
    const { context } = sp.createLoginRequest(idp, 'redirect');
    if (config.debug.logSamlMessages) {
      console.log('SAML AuthnRequest redirect URL:', context);
    }
    res.redirect(context);
  });

  // ACS - Assertion Consumer Service (POST binding)
  router.post('/acs', async (req: Request, res: Response) => {
    try {
      const { extract } = await sp.parseLoginResponse(idp, 'post', req);

      if (config.debug.logSamlMessages) {
        console.log('SAML Response received:', JSON.stringify(extract, null, 2));
      }

      // Store user in session
      req.session.user = {
        nameId: extract.nameID || 'unknown',
        attributes: extract.attributes || {},
        sessionIndex: extract.sessionIndex?.sessionIndex,
      };
      req.session.samlResponse = req.body.SAMLResponse;
      req.session.loginTime = new Date().toISOString();

      res.redirect('/profile');
    } catch (error) {
      console.error('SAML Response parsing error:', error);
      res.render('error', {
        title: 'SAML Authentication Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: config.debug.enabled ? error : undefined,
      });
    }
  });

  // Profile page - show user attributes
  router.get('/profile', (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.redirect('/');
    }
    res.render('profile', {
      user: req.session.user,
      loginTime: req.session.loginTime,
      config,
    });
  });

  // Debug page - show raw SAML response
  router.get('/debug', (req: Request, res: Response) => {
    if (!req.session.user || !req.session.samlResponse) {
      return res.redirect('/');
    }

    let decodedResponse = '';
    let formattedXml = '';
    try {
      decodedResponse = Buffer.from(req.session.samlResponse, 'base64').toString('utf-8');
      formattedXml = format(decodedResponse, {
        indentation: '  ',
        collapseContent: true,
      });
    } catch (e) {
      formattedXml = `Failed to decode/format: ${e}`;
    }

    res.render('debug', {
      user: req.session.user,
      rawResponse: req.session.samlResponse,
      decodedResponse: formattedXml,
      loginTime: req.session.loginTime,
      config,
    });
  });

  // Logout
  router.get('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect('/');
    });
  });

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
