import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const Home = async () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center gap-8 py-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            &ldquo;Sapa Telemed&rdquo; — Ваше здоровье онлайн
          </h1>
          <p className="text-lg text-gray-600">
            Получайте профессиональные медицинские приемы, управляйте своими
            медицинскими файлами и следите за здоровьем в любое время и в любом
            месте.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <a href="/sign-up">Зарегистрироваться</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/sign-in">Войти</a>
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <Image
            src="/images/telemedicine.jpg"
            alt="..."
            width={400}
            height={300}
            className="rounded-md w-full h-72 object-cover"
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12">
        <h2 className="text-3xl font-bold text-center mb-8">
          Почему выбирают Sapa Telemed?
        </h2>
        <Separator className="mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Онлайн-приемы</CardTitle>
              <CardDescription>
                Общайтесь с врачами в реальном времени через видеосвязь.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Image
                src="/images/doctor.avif"
                alt="..."
                width={400}
                height={300}
                className="rounded-md w-full h-48 object-cover"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Управление файлами</CardTitle>
              <CardDescription>
                Храните и загружайте медицинские документы в одном месте.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Image
                src="/images/manage-files.avif"
                alt="..."
                width={400}
                height={300}
                className="rounded-md w-full h-48 object-cover"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Мониторинг здоровья</CardTitle>
              <CardDescription>
                Следите за своим состоянием с помощью удобных инструментов.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Image
                src="/images/telemedicine.jpg"
                alt="..."
                width={400}
                height={300}
                className="rounded-md w-full h-48 object-cover"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
