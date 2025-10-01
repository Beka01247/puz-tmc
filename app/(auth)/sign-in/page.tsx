"use client";

import AuthForm from "@/components/AuthForm";
import PasswordResetModal from "@/components/PasswordResetModal";
import { signInSchema } from "@/lib/validations";
import React, { useState } from "react";
import { signInWithCredentials } from "@/lib/actions/auth";

const SignInPage = () => {
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);

  return (
    <div>
      <AuthForm
        type="SIGN_IN"
        schema={signInSchema}
        defaultValues={{
          email: "",
          password: "",
        }}
        onSubmit={signInWithCredentials}
      />
      
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsPasswordResetModalOpen(true)}
          className="text-sm text-primary hover:underline"
        >
          Забыли пароль?
        </button>
      </div>

      <PasswordResetModal
        isOpen={isPasswordResetModalOpen}
        onClose={() => setIsPasswordResetModalOpen(false)}
      />
    </div>
  );
};

export default SignInPage;
