export const navigationLinks = [
  {
    href: "/library",
    label: "Library",
  },

  {
    img: "/icons/user.svg",
    selectedImg: "/icons/user-fill.svg",
    href: "/my-profile",
    label: "My Profile",
  },
];

export const adminSideBarLinks = [
  {
    img: "/icons/admin/home.svg",
    route: "/admin",
    text: "Home",
  },
  {
    img: "/icons/admin/users.svg",
    route: "/admin/users",
    text: "All Users",
  },
  {
    img: "/icons/admin/book.svg",
    route: "/admin/books",
    text: "All Books",
  },
  {
    img: "/icons/admin/bookmark.svg",
    route: "/admin/book-requests",
    text: "Borrow Requests",
  },
  {
    img: "/icons/admin/user.svg",
    route: "/admin/account-requests",
    text: "Account Requests",
  },
];

export const FIELD_NAMES = {
  fullName: "ФИО",
  email: "Почта",
  password: "Пароль",
  confirmPassword: "Подтвердите пароль",
  city: "Город / область",
  organization: "Организация",
  gender: "Пол",
  department: "Отделение",
  subdivision: "Подразделение",
  district: "Участок",
  specialization: "Специальность",
  userType: "Тип пользователя",
  iin: "ИИН",
  telephone: "Телефон",
};

export const FIELD_TYPES = {
  fullName: "text",
  email: "email",
  confirmPassword: "password",
  password: "password",
  city: "text",
  organization: "text",
  gender: "select",
  department: "text",
  subdivision: "text",
  district: "text",
  specialization: "text",
  userType: "select",
  iin: "text",
  telephone: "text",
};
