import React, { useEffect, useRef, useState } from "react";
import { getRoom } from '../../api/room';
import { isEmpty } from 'lodash';
import WebSocketClient from '../../models/WebSocketClient';
import './Room.scss';
import ControlPanel from './sub-components/ControlPanel/ControlPanel';

const offerOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

enum MediaTrackKind {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export default function Room(props: any) {
  let myPeerConnection = useRef<RTCPeerConnection>(new RTCPeerConnection());
  let storedRole = '';
  let storedRoomId = '';
  let myConnectedCandidates: RTCIceCandidate[] = [];
  const [localStream, setLocalStream] = useState<MediaStream>(new MediaStream())
  let remoteStream = useRef<MediaStream>(new MediaStream());
  let localVid = useRef<HTMLVideoElement>(document.createElement('video'));
  let remoteVid = useRef<HTMLVideoElement>(document.createElement('video'));
  const [mediaStreamConstrains, setMediaStreamConstrains] = useState<MediaStreamConstraints>({ audio: true, video: true });
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [textBox, setTextBox] = useState('');

  // const [dataChannel, setDataChannel] = useState<RTCDataChannel>();
  let dataChannel = useRef<RTCDataChannel>();

  useEffect(() => {
    checkRoomAvailablity();

    WebSocketClient.ws.onmessage = async evt => {
      const parsedMessage = JSON.parse(evt.data);
      const { type, data } = parsedMessage;
      switch (type) {
        case 'handshake-ready':
          onHandshakeReady(data);
          break;
        case 'offer':
          onOffer(data);
          break;
        case 'answer':
          onAnswer(data);
          break;
        case 'add-candidate':
          onAddCandidate(data);
          break;
        case 'disconnect':
          onDisconnect();
          break;
        default:
          break;
      }
    }

    WebSocketClient.ws.onerror = evt => {
      console.log(evt)
    };

    WebSocketClient.ws.onclose = evt => {
      alert('Im Closing :)')
    };

    localVid.current.srcObject = localStream;
    remoteVid.current.srcObject = remoteStream.current;

    myPeerConnection.current.addEventListener('icecandidate', onPRIceCandidate);
    myPeerConnection.current.addEventListener('track', onPRTrack);
    myPeerConnection.current.addEventListener('negotiationneeded', onNegotiationNeeded);

  }, []);

  const microphoneClicked = async () => {
    toggleMediaTrack(MediaTrackKind.AUDIO);
  };

  const onPRTrack = (event: RTCTrackEvent) => {
    const [receivedStream] = event.streams;
    if (remoteVid.current && receivedStream) {
      console.log('Received Stream', receivedStream.getTracks());
      receivedStream.getTracks().forEach((track) => remoteStream.current.addTrack(track));
      console.log("Remote Stream", remoteStream.current.getTracks())
    }
  };

  const toggleMediaTrack = async (mediaTrackKind: MediaTrackKind) => {
    // we need to check whether the microphone is 
    // already requested and just have a enabled = false
    const hasSpecifiedTrack = localStream.getTracks().some(track => track.kind === mediaTrackKind);
    if (hasSpecifiedTrack && dataChannel.current) {
      localStream.getTracks().forEach((track) => {
        if (track.kind === mediaTrackKind) {
          track.enabled = !track.enabled;
          console.log('Track', track);
        }
      });


      dataChannel.current.send(JSON.stringify({ payload: { mediaTrackKind }, type: 'toggle-media' }));
    } else {
      // If don't have a audio track request the
      // permission to the user and add it
      const userMedia = await navigator.mediaDevices.getUserMedia({ audio: mediaTrackKind === MediaTrackKind.AUDIO, video: mediaTrackKind === MediaTrackKind.VIDEO });
      userMedia.getTracks().forEach((track) => {
        localStream.addTrack(track);
        myPeerConnection.current.addTrack(track, localStream);
      });
    }
    const newMediaStream = new MediaStream();
    localStream.getTracks().forEach(track => newMediaStream.addTrack(track));

    setLocalStream(newMediaStream);
  }

  const cameraClicked = async () => {
    toggleMediaTrack(MediaTrackKind.VIDEO);
  };

  const stopClicked = () => {
    WebSocketClient.ws.close();
    props.history.push('/');
  };


  const onDisconnect = () => {
    // Stop video and audio tracks
    const streamTracks = localStream.getTracks();
    streamTracks.forEach((track) => track.stop());
    props.history.push('/');
  };

  const onHandshakeReady = async ({ username, role, roomId }: { username: string, role: string, roomId: string }) => {
    console.log('Handshake ready');
    storedRole = role;
    storedRoomId = roomId;
    setUsername(username);

    if (storedRole === 'initiator') {
      //Create data channel to establish connection to receiver
      const myDataChannel = myPeerConnection.current.createDataChannel('chat');

      myDataChannel.onopen = onDataChannelOpen;
      myDataChannel.onmessage = onDataChannelMessage;
      myDataChannel.onclose = onDataChannelClose;
      console.log('Setting DataChannel', dataChannel);
      dataChannel.current = myDataChannel;

      sendOffer();
    } else {
      //Set on data channel to receive when initiator create data channel
      myPeerConnection.current.ondatachannel = onPRDataChannel;
    }
  }

  const sendOffer = async () => {
    const offer = await myPeerConnection.current.createOffer(offerOptions);
    myPeerConnection.current.setLocalDescription(offer);
    const payload = {
      type: 'receive-offer',
      data: {
        offer,
        roomId: storedRoomId
      },
      feature: 'peerToPeer'
    };
    sendMessageToServer(payload);
  };


  const onOffer = async (data: { offer: RTCSessionDescriptionInit }) => {
    console.log('Offer', data.offer);
    myPeerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await myPeerConnection.current.createAnswer();
    myPeerConnection.current.setLocalDescription(answer);
    const payload = {
      type: 'receive-answer',
      data: {
        answer,
        roomId: storedRoomId
      },
      feature: 'peerToPeer'
    }
    console.log('onOffer Payload', payload)
    sendMessageToServer(payload);
  }

  const onAnswer = (data: { answer: RTCSessionDescriptionInit }) => {
    console.log('Answer', data.answer);
    myPeerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  const onAddCandidate = (data: { candidate: RTCIceCandidateInit }) => {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: data.candidate.sdpMLineIndex,
      candidate: data.candidate.candidate,
      sdpMid: data.candidate.sdpMid
    });
    if (candidate && !myConnectedCandidates.includes(candidate)) {
      myConnectedCandidates.push(candidate)
      myPeerConnection.current.addIceCandidate(candidate);
    }
  }

  const sendCandidate = (candidate: RTCIceCandidate) => {
    const params = {
      type: 'add-candidate',
      data: {
        candidate,
        role: storedRole,
        roomId: storedRoomId
      },
      feature: 'peerToPeer'
    }
    WebSocketClient.ws.send(JSON.stringify(params));
  };

  const onNegotiationNeeded = async () => {
    console.log('onNegotiationNeeded Fired >>> :)');
    console.log(dataChannel);
    console.log('Username', username)
    if (dataChannel.current) {
      const { current: prConnection } = myPeerConnection;
      const offer = await prConnection.createOffer();
      await prConnection.setLocalDescription(offer);
      console.log(prConnection.localDescription?.type);
      dataChannel.current.send(JSON.stringify({ payload: { sdp: prConnection.localDescription }, type: 're-negotiate' }));
    }
  };

  const checkRoomAvailablity = async () => {
    try {
      const { params: { roomId } } = props.match;
      const room = await getRoom(roomId);

      if (!isEmpty(room)) {
        const mediaOption = localStorage.getItem('mediaOption');
        let defaultMediaStreamConstrains = mediaStreamConstrains;

        if (mediaOption) {
          defaultMediaStreamConstrains = JSON.parse(mediaOption);
          setMediaStreamConstrains(defaultMediaStreamConstrains);
        }

        if (defaultMediaStreamConstrains.audio || defaultMediaStreamConstrains.video) {
          const userMedia = await navigator.mediaDevices.getUserMedia(defaultMediaStreamConstrains);

          userMedia.getTracks().forEach(track => {
            localStream.addTrack(track);
            myPeerConnection.current.addTrack(track, localStream);
          });

          const newMediaStream = new MediaStream();
          localStream.getTracks().forEach(track => newMediaStream.addTrack(track));
          setLocalStream(newMediaStream);
        }


      } else {
        console.log('Should Redirect')
        // Redirect to the queuing room.
        props.history.push('/');
      }
    } catch (error) {
      console.log('checkRoomAvailablity Error', error);
    }

    sendReadyToPairStatus();
  };

  const sendReadyToPairStatus = () => {
    const { params: { roomId } } = props.match;
    const params = {
      type: 'ready-handshake',
      data: {
        roomId
      },
      feature: 'peerToPeer'
    }
    WebSocketClient.ws.send(JSON.stringify(params));
  };

  const sendMessageToServer = (payload: Object) => {
    WebSocketClient.ws.send(JSON.stringify(payload));
  }

  const onPRIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      sendCandidate(event.candidate);
    }
  };


  const onPRDataChannel = (event: RTCDataChannelEvent) => {
    // Receiver received the data channel from initiator
    const { channel } = event;
    const myDataChannel = channel;
    myDataChannel.onopen = onDataChannelOpen;
    myDataChannel.onmessage = onDataChannelMessage;
    myDataChannel.onclose = onDataChannelClose;
    dataChannel.current = myDataChannel;
  };

  const onDataChannelOpen = (event: Event) => {
    const { target: channel } = event;
  };

  const onDataChannelClose = (event: Event) => {
  };

  const disableRemoteMedia = (mediaTrackKind: 'audio' | 'video') => {
    remoteStream.current.getTracks().forEach((track) => {
      console.log('Track Kind > ', track.kind);
      console.log('Media Track: ', mediaTrackKind)
      if (track.kind === mediaTrackKind) {
        track.enabled = !track.enabled;
      }
    })
  };

  const onDataChannelMessage = async (event: MessageEvent) => {
    const { data } = event;
    const { payload, type } = JSON.parse(data);
    switch (type) {
      case 'chat':
        setMessages(prevMessages => prevMessages.concat(payload));
        break;
      case 're-negotiate':
        const desc = new RTCSessionDescription(payload.sdp);
        console.log('Type', desc.type);
        if (desc.type === 'offer') {
          console.log(dataChannel);
          if (dataChannel.current && remoteStream.current) {
            await myPeerConnection.current.setRemoteDescription(desc);
            const answer = await myPeerConnection.current.createAnswer();
            await myPeerConnection.current.setLocalDescription(answer);
            dataChannel.current.send(JSON.stringify({ payload: { sdp: myPeerConnection.current.localDescription }, type: 're-negotiate' }));


          }
        } else {
          await myPeerConnection.current.setRemoteDescription(desc);
        }
        break;
      case 'toggle-media':
        const { mediaTrackKind } = payload;

        disableRemoteMedia(mediaTrackKind);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    console.log('Use Effect Message', messages)
  }, [messages])

  const onTextboxChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setTextBox(value);
  };

  const sendMessage = () => {
    console.log('SendMessage', dataChannel);
    if (dataChannel.current) {
      const payload = {
        user: username,
        text: textBox
      };
      switch (dataChannel.current.readyState) {
        case "connecting":
          console.log("Connection not open; queueing: ");
          // sendQueue.push(msg);
          break;
        case "open":
          // sendQueue.forEach((msg) => dataChannel.send(msg));
          setMessages(messages.concat(payload));
          dataChannel.current.send(JSON.stringify({ payload, type: 'chat' }));
          break;
        case "closing":
          console.log("Attempted to send message while closing: ");
          break;
        case "closed":
          console.log("Error! Attempt to send while connection closed.");
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="parent-container">
      <div className="room-container">
        <div className="media-container">
          <div className="participant-media">
            <video ref={localVid} playsInline autoPlay></video>
            <p>You</p>
          </div>
          <div className="participant-media">
            <video ref={remoteVid} playsInline autoPlay></video>
            <p>Stranger</p>
          </div>
        </div>
        <div className="chat-container">
          <div className="chat-header">
            CHAT
   				</div>

          <div className="chat-content">
            {
              messages.map((message, messageIndex) => {
                return (
                  <div key={messageIndex} className="chat-message">
                    {message.user === username ? 'You' : 'Stranger'}: {message.text}
                  </div>
                );
              })
            }
          </div>

          <div className="chat-footer">
            <div className="chat-textbox">
              <textarea value={textBox} onChange={onTextboxChange} />
            </div>

            <div className="chat-action-btns">
              <button className="submit-msg" onClick={sendMessage}>Send</button>
            </div>
          </div>

        </div>
      </div>

      <div className="toolbar-container">
        <ControlPanel
          events={{ camera: cameraClicked, microphone: microphoneClicked, stop: stopClicked }}
          mediaStream={localStream}
        />
      </div>
    </div>
  );
}

interface Message {
  user: string,
  text: string
}