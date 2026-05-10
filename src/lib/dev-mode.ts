/**
 * Single switch that controls whether the app runs against localStorage
 * mocks (preview / no backend) or the real Express + Mongo backend.
 *
 * Tied to DEV_BYPASS_AUTH so when you flip auth back on you also start
 * hitting the real API.
 */
export const DEV_OFFLINE_MODE = true;
