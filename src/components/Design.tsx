import React from 'react';
import './Design.scss';
import { Button, Comment, Form, Header } from 'semantic-ui-react'

export default function Design() {
  return (
    <div className="parent-container">
      <div className="room-container">
        <div className="media-container">
          <div className="participant-media">
            <video autoPlay ></video>
            <p>Updated XD Name :)</p>
          </div>
          <div className="participant-media">
            <video autoPlay ></video>
            <p>My's Name :)</p>
          </div>
        </div>
        <Comment.Group className="chat-container">
          <Comment>
            <Comment.Avatar src='https://react.semantic-ui.com/images/avatar/small/matt.jpg' />
            <Comment.Content>
              <Comment.Author as='a'>Matt</Comment.Author>
              <Comment.Metadata>
                <div>Today at 5:42PM</div>
              </Comment.Metadata>
              <Comment.Text>How artistic!</Comment.Text>
              <Comment.Actions>
                <Comment.Action>Reply</Comment.Action>
              </Comment.Actions>
            </Comment.Content>
          </Comment>
        </Comment.Group>
      </div>

      <div className="toolbar-container">
        Toolbar Here :)
      </div>
    </div>
  );
}
