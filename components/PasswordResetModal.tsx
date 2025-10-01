"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  passwordResetRequestSchema,
  passwordResetVerifySchema,
} from "@/lib/validations";
import {
  requestPasswordReset,
  verifyPasswordReset,
} from "@/lib/actions/auth";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "phone" | "verification";

const PasswordResetModal = ({ 
  isOpen, 
  onClose 
}: PasswordResetModalProps) => {
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form for phone number input
  const phoneForm = useForm<z.infer<typeof passwordResetRequestSchema>>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      telephone: "",
    },
  });

  // Form for verification and password reset
  const verifyForm = useForm<z.infer<typeof passwordResetVerifySchema>>({
    resolver: zodResolver(passwordResetVerifySchema),
    defaultValues: {
      telephone: "",
      verificationCode: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handlePhoneSubmit = async (data: z.infer<typeof passwordResetRequestSchema>) => {
    setIsLoading(true);
    try {
      const result = await requestPasswordReset(data);
      
      if (result.success) {
        setPhoneNumber(data.telephone);
        verifyForm.setValue("telephone", data.telephone);
        setStep("verification");
        toast.success("Успешно", {
          description: result.message,
        });
      } else {
        toast.error("Ошибка", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Ошибка", {
        description: "Произошла неожиданная ошибка",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (data: z.infer<typeof passwordResetVerifySchema>) => {
    setIsLoading(true);
    try {
      const result = await verifyPasswordReset(data);
      
      if (result.success) {
        toast.success("Успешно", {
          description: result.message,
        });
        handleClose();
      } else {
        toast.error("Ошибка", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Ошибка", {
        description: "Произошла неожиданная ошибка",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("phone");
    setPhoneNumber("");
    phoneForm.reset();
    verifyForm.reset();
    onClose();
  };

  const handleBackToPhone = () => {
    setStep("phone");
    verifyForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Сброс пароля" : "Подтверждение и новый пароль"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "Введите номер телефона для получения кода подтверждения"
              : "Введите код подтверждения и новый пароль"}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" && (
          <Form {...phoneForm}>
            <form
              onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
              className="space-y-4"
            >
              <FormField
                control={phoneForm.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер телефона</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+7 700 123 45 67"
                        {...field}
                        className="form-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Отправка..." : "Отправить код"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "verification" && (
          <Form {...verifyForm}>
            <form
              onSubmit={verifyForm.handleSubmit(handleVerifySubmit)}
              className="space-y-4"
            >
              <div className="text-sm text-muted-foreground">
                Код отправлен на номер: <strong>{phoneNumber}</strong>
              </div>
              
              <FormField
                control={verifyForm.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код подтверждения</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        {...field}
                        className="form-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={verifyForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Новый пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Введите новый пароль"
                          {...field}
                          className="form-input pr-12"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={verifyForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтвердите пароль</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Подтвердите новый пароль"
                        {...field}
                        className="form-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToPhone}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Сохранение..." : "Сохранить пароль"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetModal;