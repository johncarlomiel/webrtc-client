import axios from 'axios';

const apiBaseURL =  `https://${process.env.REACT_APP_API_DOMAIN}`;

export const getRoom = async (roomId: string) => {
  const URL = `${apiBaseURL}/rooms/${roomId}`;
  console.log(`URL : ${URL}`)
  const { data: { room } } = await axios.get(URL);
  
  return room;
};  