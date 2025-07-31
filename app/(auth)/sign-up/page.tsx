"use client";

import AuthForm from "@/components/AuthForm";
import { signUpSchema } from "@/lib/validations";
import { UserType } from "@/constants/userTypes";
import { signUp } from "@/lib/actions/auth";
import React from "react";

const SignUpPage = () => {
  return (
    <AuthForm
      type="SIGN_UP"
      schema={signUpSchema}
      defaultValues={{
        iin: "",
        fullName: "",
        telephone: "",
        email: "",
        password: "",
        confirmPassword: "",
        city: "",
        organization: "",
        userType: "" as UserType,
        gender: "МУЖСКОЙ" as const,
        department: "",
        subdivision: "",
        district: "",
        specialization: "",
      }}
      onSubmit={signUp}
    />
  );
};

export default SignUpPage;
