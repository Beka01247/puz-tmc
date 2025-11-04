import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import React, { ReactNode } from "react";

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Separator className="mb-6 bg-gray-600" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Sapa Telemed</h3>
              <p className="text-sm">
                Ваше здоровье — наш приоритет. Получайте качественную
                медицинскую помощь онлайн в любое время.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Навигация</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/sign-in" className="hover:text-primary">
                    Войти
                  </a>
                </li>
                <li>
                  <a href="/sign-up" className="hover:text-primary">
                    Регистрация
                  </a>
                </li>
                <li>
                  <a href="/sign-up" className="hover:text-primary">
                    Возможности
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Контакты</h3>
              <p className="text-sm">
                Email: info@sapatelemed.kz
                <br />
                Телефон: +7 (771) 101-98-88
              </p>
            </div>
          </div>
          <Separator className="my-6 bg-gray-600" />
          <p className="text-center text-sm">
            &copy; {new Date().getFullYear()} Sapa Telemed. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
