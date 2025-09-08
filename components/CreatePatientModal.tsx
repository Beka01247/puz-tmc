"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPatientSchema } from "@/lib/validations";
import { createPatient } from "@/lib/actions/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Plus } from "lucide-react";

type CreatePatientData = z.infer<typeof createPatientSchema>;

interface CreatePatientModalProps {
  creatorInfo: {
    region?: string;
    city: string;
    district?: string;
    settlement?: string;
    village?: string;
    organization: string;
  };
  onPatientCreated?: () => void;
}

const CreatePatientModal: React.FC<CreatePatientModalProps> = ({
  creatorInfo,
  onPatientCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePatientData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      gender: "МУЖСКОЙ",
      iin: "",
      telephone: "",
    },
  });

  const onSubmit = async (data: CreatePatientData) => {
    setIsSubmitting(true);
    try {
      const result = await createPatient(data, creatorInfo);

      if (result.success) {
        toast.success("Пациент успешно создан", {
          description: `Пациент ${data.fullName} добавлен в систему`,
        });
        form.reset();
        setOpen(false);
        onPatientCreated?.();
      } else {
        toast.error("Ошибка создания пациента", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Ошибка", {
        description: "Произошла неожиданная ошибка",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format location info for display
  const locationInfo = [
    creatorInfo.region && `Область: ${creatorInfo.region}`,
    `Город: ${creatorInfo.city}`,
    creatorInfo.district && `Район: ${creatorInfo.district}`,
    creatorInfo.settlement && `Поселок: ${creatorInfo.settlement}`,
    creatorInfo.village && `Село: ${creatorInfo.village}`,
    `Организация: ${creatorInfo.organization}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus size={16} />
          Добавить пациента
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать нового пациента</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Пациент будет автоматически привязан к: {locationInfo}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ФИО *</FormLabel>
                  <FormControl>
                    <Input placeholder="Фамилия Имя Отчество" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ИИН *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456789012"
                      maxLength={12}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пол *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите пол" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="МУЖСКОЙ">Мужской</SelectItem>
                      <SelectItem value="ЖЕНСКИЙ">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон *</FormLabel>
                  <FormControl>
                    <Input placeholder="+77771234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="patient@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Введите пароль"
                        className="pr-12"
                        {...field}
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
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтвердите пароль *</FormLabel>
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Повторите пароль"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Создание..." : "Создать пациента"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePatientModal;
