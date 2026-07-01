import { platform } from "@platform/index";



const openSupportContact = async (mailtoUrl: string): Promise<void> => {
  await platform.shell.openExternal(mailtoUrl);
};



export { openSupportContact };
