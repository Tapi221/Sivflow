import platform from "@/platform";

const openSupportContact = async (mailtoUrl: string): Promise<void> => {
  await platform.shell.openExternal(mailtoUrl);
};

export { openSupportContact };
