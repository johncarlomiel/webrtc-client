import React, { useRef } from 'react';
import Header from '../Header/Header';
import './Homepage.scss';
import { Link } from 'react-router-dom';
import { Button, Modal } from 'semantic-ui-react'
import { useEffect } from 'react';
import { useState } from 'react';
export default function Homepage() {
  const timer = useRef(null);
  const [timerModal, setTimerModal] = useState({
    size: 'tiny',
    open: false
  });
  const [elapsedTime, setElapsedTime] = useState(1);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    }
  }, []);

  const startQueue = () => {
    setTimerModal(timerModal => {
      return {
        ...timerModal,
        open: true
      };
    });
    timer.current = setInterval(() => setElapsedTime(elapsedTime => elapsedTime + 1), 1000);
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

        <Button
          icon='stop'
          onClick={stopQueue}
          content='Stop Queue'
        />
      </div>

      <Modal size={timerModal.size} open={timerModal.open} onClose={closeModal}>
        <Modal.Header className="timer-modal-head">Searching for a match</Modal.Header>
        <Modal.Content>
          <p>{elapsedTime} Seconds</p>
        </Modal.Content>
        <Modal.Actions>
          <Button negative onClick={closeModal} content="Cancel"/>
        </Modal.Actions>
      </Modal>
    </div>
  );
}