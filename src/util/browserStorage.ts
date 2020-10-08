import { icons } from "../data/icons";
import { Icon } from "../data/interface";

// Get the user avatar and return default 
// avatar if user doesn't have avatar selected
export const getUserAvatar = (): Icon => {
  const storedAvatar = localStorage.getItem('avatar');

  if (storedAvatar) {
    const parsedAvatar = JSON.parse(storedAvatar);
    if (parsedAvatar.title) {
      const icon = icons.find(icon => icon.title === parsedAvatar.title);
      if (icon) return icon;
    }
  }

  return icons[0];
};