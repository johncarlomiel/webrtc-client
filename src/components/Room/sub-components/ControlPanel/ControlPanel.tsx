import React from 'react';
import { Button } from 'semantic-ui-react';
import './ControlPanel.scss';

export default function ControlPanel({ mediaStreamConstraints: { video, audio }, events }: Props) {

  const getMediaColorStatus = (mediaStreamConstraint: boolean | MediaTrackConstraints | undefined) => {
    return mediaStreamConstraint ? 'blue' : 'grey';
  };

  return (
    <div className='control-panel'>
      <Button onClick={() => events.camera()} icon='video camera' color={getMediaColorStatus(video)} size='huge' circular />
      <Button onClick={() => events.microphone()} icon='microphone' color={getMediaColorStatus(audio)} size='huge' circular />
      <Button onClick={() => events.stop()} icon='stop' color='red' size='huge' circular />
    </div>
  );
}


interface Props {
  mediaStreamConstraints: MediaStreamConstraints,
  events: {
    camera: Function,
    microphone: Function,
    stop: Function
  }
}