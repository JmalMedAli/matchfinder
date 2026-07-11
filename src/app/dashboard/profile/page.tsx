"use client";

import { ProfileForm } from "@/components/profile-form";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <ProfileForm />
    </div>
  );
}
