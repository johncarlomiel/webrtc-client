import React from 'react';
import './Design.scss';

export default function Design() {
  return (
    <div className="parent-container">
      <div className="room-container">
        <div className="media-container">
          <div className="participant-media">
            <video autoPlay ></video>
            <p>Stranger's Name :)</p>
          </div>
          <div className="participant-media">
            <video autoPlay ></video>
            <p>My's Name :)</p>
          </div>
        </div>
        <div className="chat-container">
          Chat Container
      </div>
      </div>

      <div className="toolbar-container">
        Toolbar Here :)
      </div>
    </div>
  );
}