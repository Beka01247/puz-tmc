import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    fullName: string;
    userType: string;
    region?: string;
    city: string;
    district?: string;
    settlement?: string;
    village?: string;
    organization: string;
    department?: string;
    subdivision?: string;
    specialization?: string;
    avatar?: string;
    iin: string;
    telephone: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      userType: string;
      region?: string;
      city: string;
      district?: string;
      settlement?: string;
      village?: string;
      organization: string;
      department?: string;
      subdivision?: string;
      specialization?: string;
      avatar?: string;
      iin: string;
      telephone: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    fullName: string;
    userType: string;
    region?: string;
    city: string;
    district?: string;
    settlement?: string;
    village?: string;
    organization: string;
    department?: string;
    subdivision?: string;
    specialization?: string;
    avatar?: string;
    iin: string;
    telephone: string;
  }
}
