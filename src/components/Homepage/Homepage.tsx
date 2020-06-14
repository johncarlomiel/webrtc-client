import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, StrictModalProps } from 'semantic-ui-react'
import Header from '../Header/Header';
import WebSocketClient from '../../models/WebSocketClient';
import Swal from 'sweetalert2'
import SimpleModal, { SimpleModalHandles } from '../sub-components/SimpleModal';
import isEmpty from 'lodash/isEmpty';
import './Homepage.scss';

export default function Homepage() {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [elapsedTime, setElapsedTime] = useState(1);

  const [queueStatus, setQueueStatus] = useState<State>();

  const timerModal = useRef<SimpleModalHandles>();

  useEffect(() => {
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

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    }
  }, []);

  const breakMatch = () => {
    Swal.close();
    closeModal();
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

  const matchReady = (data: Object) => {
    alert('Match Ready');
  };

  const onReceiveQueueInfo = ({ roomId }: { roomId: string }) => {
    closeModal();
    Swal.fire({
      title: 'Match found',
      text: "Do you want to accept it?",
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Accept'
    }).then((result) => {
      console.log('Result >> ', result);
      if (!isEmpty(result)) {
        let response = result.value ? 'accept' : 'reject';
        console.log('Response', result);
        invitationResponse(response, roomId);
      }
    });
  };

  const startQueue = () => {
    setQueueStatus(State.QUEUE);

    if(timerModal.current) {
      timerModal.current.toggle();
    }

    timer.current = setInterval(() => setElapsedTime(elapsedTime => elapsedTime + 1), 1000);

    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'queue'
    });
  };

  const invitationResponse = (response: string, roomId: string) => {
    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'invitation-response',
      data: {
        roomId, response
      }
    });
  };

  const cancelModalCb = () => {
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


  const { header, content } = queueStatus ? getModalState(queueStatus) : { header: '', content: '' };

  return (
    <div id="home-page">
      <Header />
      <div id="home-body">
        <Button
          icon='play'
          onClick={startQueue}
          content='Start Queue'
        />
      </div>

      <SimpleModal
        content={content}
        header={header}
        options={{ size: 'small' }}
        onCloseCb={cancelModalCb}
        ref={timerModal} />

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

enum State {
  QUEUE = 'queuing',
  WAITING = 'waiting'
}