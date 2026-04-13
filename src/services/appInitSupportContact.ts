import platform from "@/platform";

export const openSupportContact = async (mailtoUrl: string): Promise<void> => {
  await platform.shell.openExternal(mailtoUrl);
};
