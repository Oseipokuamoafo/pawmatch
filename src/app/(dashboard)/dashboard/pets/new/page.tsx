"use client";

import { useRouter } from "next/navigation";

import { PetWizard } from "@/components/pets/PetWizard";
import { useToast } from "@/components/toast/ToastProvider";

export default function NewPetPage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <PetWizard
      onSuccess={(pet) => {
        toast.success("Pet created", `${pet.name} is on your registry.`);
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
