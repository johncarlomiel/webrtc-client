import React, { useRef } from 'react';
import Header from '../Header/Header';
import './Homepage.scss';
import { Link } from 'react-router-dom';
import { Button, Modal } from 'semantic-ui-react'
import { useEffect } from 'react';
import { useState } from 'react';
import WebSocketClient from '../../models/WebSocketClient';
import Swal from 'sweetalert2'

export default function Homepage() {
  const timer = useRef(null);
  const [timerModal, setTimerModal] = useState({
    size: 'tiny',
    open: false
  });
  const [elapsedTime, setElapsedTime] = useState(1);

  const [queueStatus, setQueueStatus] = useState();

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
          breakMatch(data);
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

  const breakMatch = (data) => {
    console.log(data);
  };

  const matchReady = (data) => {
    alert('Match Ready');
    console.log(data);
  };

  const onReceiveQueueInfo = ({ roomId }) => {
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
      let response = result.value ? 'accept' : 'reject';
      invitationResponse(response, roomId);
    });
  };

  const startQueue = () => {
    console.log('Starting Queue')
    setQueueStatus('queuing');
    setTimerModal(timerModal => {
      return {
        ...timerModal,
        open: true
      };
    });
    timer.current = setInterval(() =>  setElapsedTime(elapsedTime => elapsedTime + 1), 1000);

    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'queue'
    });
  };

  const invitationResponse = (response, roomId) => {
    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'invitation-response',
      data: {
        roomId, response
      }
    }); 
  };

  const closeModal = () => {
    setTimerModal(timerModal => {
      return {
        ...timerModal,
        open: false
      };
    });
    clearInterval(timer.current);
    setElapsedTime(1);

    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'cancel-queue'
    });
  };

  const getModalState = (state) => {
    const modalState = {
      queuing: {
        header: 'Searching for a match',
        content: `${elapsedTime} Seconds`
      },
      waiting: {
        header: 'Match accepted',
        content: 'Please wait for the others to accept the invitation'
      }
    };
    return state ? modalState[state] : { header: '', content: ''};
  }

  
  const { header, content } = getModalState(queueStatus);
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

      <Modal size={timerModal.size} open={timerModal.open} onClose={closeModal}>
        <Modal.Header className="timer-modal-head">{header}</Modal.Header>
        <Modal.Content>
          <p>{content}</p>
        </Modal.Content>
        <Modal.Actions>
          <Button negative onClick={closeModal} content="Cancel" />
        </Modal.Actions>
      </Modal>

    </div>
  );
}