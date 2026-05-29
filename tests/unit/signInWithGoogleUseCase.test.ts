import { describe, expect, it, vi } from "vitest";
import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";

describe("createSignInWithGoogleUseCase", () => {
  it("calls the provided auth port", async () => {
    const auth = { signIn: vi.fn(async () => {}) };

    const useCase = createSignInWithGoogleUseCase({ auth });
    await useCase.execute();

    expect(auth.signIn).toHaveBeenCalledTimes(1);
  });
});
