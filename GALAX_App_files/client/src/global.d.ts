/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      selectedAddress?: string | null;
      networkVersion?: string;
      on?: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener?: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export {};