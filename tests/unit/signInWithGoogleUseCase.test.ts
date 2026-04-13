import { describe, expect, it, vi } from "vitest";
import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";

describe("SignInWithGoogle", () => {
  it("delegates to injected auth port", async () => {
    const auth = { signIn: vi.fn().mockResolvedValue(undefined) };

    await createSignInWithGoogleUseCase({ auth }).execute();

    expect(auth.signIn).toHaveBeenCalledTimes(1);
  });
});

