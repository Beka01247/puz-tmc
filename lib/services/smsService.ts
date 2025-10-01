interface MobizonSMSResponse {
  code: number;
  message: string;
  data?: unknown;
}

interface MobizonConfig {
  apiKey: string;
  baseUrl: string;
}

export class MobizonSMSService {
  private config: MobizonConfig;

  constructor() {
    this.config = {
      apiKey: process.env.MOBIZON_API_KEY || "",
      baseUrl: process.env.MOBIZON_BASE_URL || "https://api.mobizon.kz/service",
    };

    if (!this.config.apiKey) {
      console.warn("MOBIZON_API_KEY environment variable is not set");
    }
  }

  async sendVerificationCode(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message = `Ваш код для сброса пароля в Sapa Telemed: ${code}. Код действителен 10 минут.`;
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const bodyParams = new URLSearchParams({
        recipient: normalizedPhone,
        text: message,
        from: "SapaTelemed",
      });
      
      const apiUrl = `${this.config.baseUrl}/message/sendSmsMessage?output=json&api=v1&apiKey=${encodeURIComponent(this.config.apiKey)}`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: bodyParams,
      });

      if (!response.ok) {
        console.error("Mobizon API error:", response.status, response.statusText);
        return {
          success: false,
          error: "Ошибка отправки SMS",
        };
      }

      const result: MobizonSMSResponse = await response.json();
      
      // code 0 = success, code 1 = error
      if (result.code === 0) {
        return { success: true };
      } else {
        console.error("Mobizon API error:", result.message);
        
        return {
          success: false,
          error: "Ошибка отправки SMS: " + result.message,
        };
      }
    } catch (error) {
      console.error("SMS service error:", error);
      return {
        success: false,
        error: "Ошибка отправки SMS",
      };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, "");
    
    // Remove leading + if present
    if (normalized.startsWith("+")) {
      normalized = normalized.substring(1);
    }
    
    // Ensure it starts with 7 for Kazakhstan
    if (normalized.startsWith("8")) {
      normalized = "7" + normalized.substring(1);
    }
    
    return normalized;
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Export singleton instance
export const smsService = new MobizonSMSService();