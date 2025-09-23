"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertTriangle, Shield, Trash2 } from "lucide-react";

const AccountDeletionPage = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Удаление аккаунта
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Мы понимаем, что иногда требуется удалить аккаунт. Наша команда поддержки поможет вам с этим процессом.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Важная информация
              </CardTitle>
              <CardDescription>
                Пожалуйста, ознакомьтесь с этой информацией перед подачей запроса на удаление аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Удаление аккаунта является необратимым процессом. Все ваши данные, включая медицинские записи, 
                      историю консультаций и файлы, будут безвозвратно удалены из нашей системы.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Что будет удалено:</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Профиль пациента</li>
                    <li>• История консультаций</li>
                    <li>• Медицинские записи</li>
                    <li>• Загруженные файлы</li>
                    <li>• Результаты обследований</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Время обработки:</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Обработка запроса: 1-3 рабочих дня</li>
                    <li>• Полное удаление: до 30 дней</li>
                    <li>• Уведомление об удалении: email</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Связаться с поддержкой
              </CardTitle>
              <CardDescription>
                Отправьте запрос на удаление аккаунта нашей команде поддержки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Для обработки запроса включите следующую информацию:
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Email аккаунта для удаления</li>
                  <li>• Полное имя</li>
                  <li>• Причина удаления (опционально)</li>
                  <li>• Подтверждение решения</li>
                </ul>
              </div>
              
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Напишите на email:
                </p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  support@sapatelemed.ru
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Если у вас есть вопросы о процессе удаления аккаунта или вам нужна дополнительная помощь,
            наша команда поддержки всегда готова помочь.
          </p>
          <p className="mt-2">
            <Button variant="link" onClick={() => window.history.back()}>
              ← Вернуться назад
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionPage;