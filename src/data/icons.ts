import Angry from '../assets/images/angry.png';
import Dad from '../assets/images/dad.png';
import Dead from '../assets/images/dead.png';
import Girl from '../assets/images/girl.png';
import Hacker from '../assets/images/hacker.png';
import Jewish from '../assets/images/jewish.png';
import Man from '../assets/images/man.png';
import Pilot from '../assets/images/pilot.png';
import Woman from '../assets/images/woman.png';
import { Icon } from './interface';

export const icons: Icon[] = [
  { src: Angry, title: 'Angry' },
  { src: Dad, title: 'Dad' },
  { src: Dead, title: 'Dead' },
  { src: Girl, title: 'Girl' },
  { src: Hacker, title: 'Hacker' },
  { src: Jewish, title: 'Jewish' },
  { src: Man, title: 'Man' },
  { src: Pilot, title: 'Pilot' },
  { src: Woman, title: 'Woman' },
];



const getRandomInt = (max: number) => Math.floor(Math.random() * Math.floor(max));

export const getRandomIcon = (): Icon => {
  const randomInt = getRandomInt(icons.length);
  return icons[randomInt];
};


