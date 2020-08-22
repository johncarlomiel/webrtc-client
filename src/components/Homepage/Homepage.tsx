import React, { useRef, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  Button,
  Radio,
  Grid,
  Header,
  Icon,
  Search,
  Divider,
  Segment,
} from 'semantic-ui-react'
import NavigationHeader from '../Header/Header';
import WebSocketClient from '../../models/WebSocketClient';
import Swal from 'sweetalert2'
import SimpleModal, { SimpleModalHandles } from '../sub-components/SimpleModal';
import isEmpty from 'lodash/isEmpty';
import './Homepage.scss';

enum State {
  QUEUE = 'queuing',
  WAITING = 'waiting'
}

enum Response {
  ACCEPT = 'accept',
  DECLINE = 'reject'
}

enum MediaStream {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export default function Homepage() {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [elapsedTime, setElapsedTime] = useState(1);
  const routeHistory = useHistory();
  const [queueStatus, setQueueStatus] = useState<State>();
  const [roomId, setRoomId] = useState<string>();
  const timerModal = useRef<SimpleModalHandles>();
  const matchReadyModal = useRef<SimpleModalHandles>();
  const [mediaStream, setMediaStream] = useState({ video: true, audio: true });

  useEffect(() => {
    // Load the default settings on localStorage
    const storedMediaOption = localStorage.getItem('mediaOption');
    if (storedMediaOption) {
      setMediaStream(JSON.parse(storedMediaOption));
    }

    WebSocketClient.ws.onopen = () => {
      console.log("Websocket Connected");
    };

    WebSocketClient.ws.onmessage = event => {
      const parsedMessage = JSON.parse(event.data);
      const { type, data } = parsedMessage;
      switch (type) {
        case 'received-queue-info':
          onReceiveQueueInfo(data);
          break;
        case 'break-match':
          breakMatch();
          break;
        case 'match-ready':
          matchReady(data);
          break;
        default:
          break;
      }
    };

    WebSocketClient.ws.onerror = event => {
      console.log('Error');
    };

    WebSocketClient.ws.onclose = () => {
      console.log('Im closing hehe :)')
    }

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    }
  }, []);

  const breakMatch = () => {
    if(matchReadyModal.current) {
      matchReadyModal.current.toggle();
    }
  };

  const closeModal = () => {
    if (timerModal.current) {
      timerModal.current.toggle();
    }
    if (timer.current) {
      clearInterval(timer.current);
    }
    setElapsedTime(1);
  }

  const matchReady = ({ roomId }: { roomId: string }) => {
    routeHistory.push(`/room/${roomId}`);
  };

  const onReceiveQueueInfo = ({ roomId }: { roomId: string }) => {
    closeModal();
    setRoomId(roomId);
    matchReadyModal.current?.toggle();
  };

  const startQueue = () => {
    setQueueStatus(State.QUEUE);

    if (timerModal.current) {
      timerModal.current.toggle();
    }

    timer.current = setInterval(() => setElapsedTime(elapsedTime => elapsedTime + 1), 1000);

    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'queue'
    });
  };

  const invitationResponse = (response: Response) => {
    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'invitation-response',
      data: {
        roomId, response
      }
    });
  };

  const cancelModalCb = () => {
    if (timer.current) {
      clearInterval(timer.current);
    }
    setElapsedTime(1);
    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'cancel-queue'
    });
  }

  const getModalState = (state: State) => {
    const modalState: ModalState = {
      queuing: {
        header: 'Searching for a match',
        content: `${elapsedTime} Seconds`
      },
      waiting: {
        header: 'Match accepted',
        content: 'Please wait for the others to accept the invitation'
      }
    };
    return modalState[state];
  }

  const toggleMediaStream = (streamType: MediaStream) => {
    const modifiedMediaStream = {
      ...mediaStream,
      [streamType]: !mediaStream[streamType],
    };
    localStorage.setItem('mediaOption', JSON.stringify(modifiedMediaStream));
    setMediaStream(modifiedMediaStream);
  };

  const { header, content } = queueStatus ? getModalState(queueStatus) : { header: '', content: '' };
  const mediaStreamMarkup = (
    <Grid className="media-select" relaxed textAlign='center'>
      <Header as='h2' textAlign='center'>
        Match Found :)
        <Header.Subheader>
          Please select a media stream :D
        </Header.Subheader>
      </Header>
      <Grid.Row verticalAlign='middle'>
        <Grid.Column width={8}>
          <Header icon>
            <Icon name='microphone' />
            <Radio slider checked={mediaStream.audio} onClick={() => toggleMediaStream(MediaStream.AUDIO)} />
          </Header>
        </Grid.Column>
        <Grid.Column width={8}>
          <Header icon>
            <Icon name='video camera' />
            <Radio slider checked={mediaStream.video} onClick={() => toggleMediaStream(MediaStream.VIDEO)} />
          </Header>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
  return (
    <div id="home-page">
      <div id="home-body">
        <Button
          icon='play'
          onClick={startQueue}
          content='Start Queue'
          size='massive'
        />
      </div>

      <SimpleModal
        content={<p>{content}</p>}
        header={header}
        options={{ size: 'small' }}
        onCloseCb={cancelModalCb}
        ref={timerModal} />

      <SimpleModal
        content={mediaStreamMarkup}
        options={{ size: 'small' }}
        onAcceptCb={() => invitationResponse(Response.ACCEPT)}
        onCloseCb={() => invitationResponse(Response.DECLINE)}
        ref={matchReadyModal}
      />

    </div>
  );
}

interface ModalContent {
  header: string,
  content: string
}

interface ModalState {
  queuing: ModalContent,
  waiting: ModalContent
}

