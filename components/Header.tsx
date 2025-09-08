import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { userTypeLabels } from "@/constants/userTypes";

const Header = async () => {
  const session = await auth();

  return (
    <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex justify-between gap-5 items-center">
      <Link href="/" className="text-xl font-semibold text-gray-900">
        Sapa Telemed
      </Link>

      <ul className="flex flex-row items-center gap-4">
        {!session ? (
          <li className="flex items-center gap-4">
            <Button asChild variant="outline">
              <Link href="/sign-in">Войти</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/sign-up">Зарегистрироваться</Link>
            </Button>
          </li>
        ) : (
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className={cn(
                    "flex items-center space-x-3 cursor-pointer",
                    "px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors border border-border"
                  )}
                >
                  <Avatar>
                    <AvatarImage alt={session?.user?.fullName || "User"} />
                    <AvatarFallback>
                      {session?.user?.fullName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">
                    {session?.user?.fullName || "User"}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.fullName || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.userType &&
                        userTypeLabels[
                          session.user.userType as keyof typeof userTypeLabels
                        ]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.organization &&
                        `${session.user.organization}`}
                      {session?.user?.city && `, ${session.user.city}`}
                      {session?.user?.region && `, ${session.user.region}`}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Личный кабинет</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/sign-in" });
                    }}
                    className="w-full"
                  >
                    <button type="submit" className="w-full text-left">
                      Выйти
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
      </ul>
    </header>
  );
};

export default Header;
