// Advisory data host and signing key (docs/05_ADVISORY_DATA.md, D-014). The build pipeline
// imports this file too, so a wrong signing secret fails the build before anything is published.
export const DATA_BASE_URL = 'https://andynur.github.io/phpusing/v1/';

/** Ed25519 public key, 32 raw bytes in base64. */
export const DATA_PUBLIC_KEY = 'xfMGmhPU9mYODMgYTWyy+gmb4oB2+Qr4ShdEwKFSjhE=';
