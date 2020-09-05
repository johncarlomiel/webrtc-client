import axios from 'axios';

let domain = process.env.REACT_APP_API_DOMAIN;

if (process.env.NODE_ENV !== 'production') {
  domain = '192.168.100.91:8080';
}

const apiBaseURL = `https://${domain}`;

export const getRoom = async (roomId: string) => {
  const URL = `${apiBaseURL}/rooms/${roomId}`;
  console.log(`URL : ${URL}`)
  const { data: { room } } = await axios.get(URL);

  return room;
};  