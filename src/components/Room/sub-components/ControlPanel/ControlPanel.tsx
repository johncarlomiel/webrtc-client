import React, { useEffect } from 'react';
import { Button } from 'semantic-ui-react';
import './ControlPanel.scss';

export default function ControlPanel({ mediaStream, events }: Props) {

  useEffect(() => {
    console.log('MediaStream', mediaStream)
    console.log(mediaStream.getAudioTracks())
  }, [mediaStream])
  const getMediaColorStatus = (mediaStreamTrack: MediaStreamTrack[]) => {
    return mediaStreamTrack.length > 0 && mediaStreamTrack.every(track => track.enabled) ? 'blue' : 'grey';
  };

  return (
    <div className='control-panel'>
      <Button onClick={() => events.camera()} icon='video camera' color={getMediaColorStatus(mediaStream.getVideoTracks() || [])} size='huge' circular />
      <Button onClick={() => events.microphone()} icon='microphone' color={getMediaColorStatus(mediaStream.getAudioTracks() || [])} size='huge' circular />
      <Button onClick={() => events.stop()} icon='stop' color='red' size='huge' circular />
    </div>
  );
}


interface Props {
  mediaStream: MediaStream,
  events: {
    camera: Function,
    microphone: Function,
    stop: Function
  }
}