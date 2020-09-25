import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Button, Sidebar, Segment } from 'semantic-ui-react';
import './ControlPanel.scss';

function ControlPanel({ mediaStream, events, isOpen }: Props, ref:any) {
  const [isOnFocus, setIsOnFocus] = useState(false);
  useEffect(() => {
    console.log('MediaStream', mediaStream)
    console.log(mediaStream.getAudioTracks())
  }, [mediaStream])
  const getMediaColorStatus = (mediaStreamTrack: MediaStreamTrack[]) => {
    return mediaStreamTrack.length > 0 && mediaStreamTrack.every(track => track.enabled) ? 'blue' : 'grey';
  };


  useImperativeHandle(ref, () => ({ 
    isOnFocusStatus: () => isOnFocus
  }));

  return (
    <Sidebar
      as={Segment}
      animation='overlay'
      direction='bottom'
      visible={isOpen}
    >
      <div
        className='control-panel'
        onMouseEnter={() => setIsOnFocus(true)}
        onMouseLeave={() => setIsOnFocus(false)}
      >
        <Button onClick={() => events.camera()} icon='video camera' color={getMediaColorStatus(mediaStream.getVideoTracks() || [])} size='huge' circular />
        <Button onClick={() => events.microphone()} icon='microphone' color={getMediaColorStatus(mediaStream.getAudioTracks() || [])} size='huge' circular />
        <Button onClick={() => events.stop()} icon='stop' color='red' size='huge' circular />
      </div>
    </Sidebar>
  );
}


interface Props {
  mediaStream: MediaStream,
  isOpen: boolean,
  events: {
    camera: Function,
    microphone: Function,
    stop: Function
  }
}
export default forwardRef(ControlPanel);