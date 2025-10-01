// Shared verification codes store
// simple in-memory store for pilot

export interface VerificationCodeData {
  code: string;
  expiresAt: Date;
}

// Global variable to ensure persistence across Next.js API routes
declare global {
  // eslint-disable-next-line no-var
  var __verificationCodes: Map<string, VerificationCodeData> | undefined;
}

const getStore = (): Map<string, VerificationCodeData> => {
  if (!global.__verificationCodes) {
    global.__verificationCodes = new Map();
  }
  return global.__verificationCodes;
};

class VerificationCodeStore {
  set(phoneNumber: string, data: VerificationCodeData): void {
    getStore().set(phoneNumber, data);
  }

  get(phoneNumber: string): VerificationCodeData | undefined {
    return getStore().get(phoneNumber);
  }

  delete(phoneNumber: string): boolean {
    return getStore().delete(phoneNumber);
  }

  // Cleanup expired codes periodically
  cleanup(): void {
    const now = new Date();
    const store = getStore();
    for (const [phoneNumber, data] of store.entries()) {
      if (now > data.expiresAt) {
        store.delete(phoneNumber);
      }
    }
  }
}

// Export singleton instance
export const verificationCodeStore = new VerificationCodeStore();

// Run cleanup every 5 minutes
setInterval(
  () => {
    verificationCodeStore.cleanup();
  },
  5 * 60 * 1000
);
