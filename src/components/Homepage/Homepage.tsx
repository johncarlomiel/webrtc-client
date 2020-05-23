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
        default:
          break;
      }
    };

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    }
  });

  const onReceiveQueueInfo = (data) => {
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
      if (result.value) {
        
      }else if(result.dismiss === Swal.DismissReason.cancel){ 
        console.log('reject');
      }
    })
  };

  const sendQueue = () => {
    WebSocketClient.sendMessage({
      feature: 'peerToPeer',
      type: 'queue',
    })
  };

  const startQueue = () => {
    setTimerModal(timerModal => {
      return {
        ...timerModal,
        open: true
      };
    });
    timer.current = setInterval(() => setElapsedTime(elapsedTime => elapsedTime + 1), 1000);
    sendQueue();
  };

  const closeModal = () => {
    setTimerModal(timerModal => {
      return {
        ...timerModal,
        open: false
      };
    });
    stopQueue();
    setElapsedTime(1);
  };

  const stopQueue = () => {
    clearInterval(timer.current);
  };

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
        <Modal.Header className="timer-modal-head">Searching for a match</Modal.Header>
        <Modal.Content>
          <p>{elapsedTime} Seconds</p>
        </Modal.Content>
        <Modal.Actions>
          <Button negative onClick={closeModal} content="Cancel" />
        </Modal.Actions>
      </Modal>
    </div>
  );
}