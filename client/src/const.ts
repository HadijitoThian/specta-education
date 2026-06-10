export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Login URL — points at our own server, which initiates the Google OAuth
 * flow and redirects the user back to "/" after a session cookie is set.
 */
export const getLoginUrl = () => "/api/oauth/login";
