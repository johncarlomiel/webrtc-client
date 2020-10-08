import React, { useEffect, useRef, useState } from "react";
import WebSocketClient from '../../models/WebSocketClient';
import ControlPanel from './sub-components/ControlPanel/ControlPanel';
import { getRoom } from '../../api/room';
import { isEmpty } from 'lodash';
import { Button, Comment, Form, Header, Icon } from 'semantic-ui-react'
import { icons, getRandomIcon } from '../../data/icons';
import { format, formatDistanceToNow } from 'date-fns'
import './Room.scss';
import Editor from 'draft-js-plugins-editor';
import createEmojiPlugin from 'draft-js-emoji-plugin';
import { ContentState, convertToRaw, EditorState } from 'draft-js';
import { Icon as Avatar } from '../../data/interface';
import 'draft-js-emoji-plugin/lib/plugin.css';

const offerOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

enum MediaTrackKind {
  AUDIO = 'audio',
  VIDEO = 'video'
}

const myIcon = getRandomIcon();
const strangerIcon = getRandomIcon();
const emojiPlugin = createEmojiPlugin();
const { EmojiSuggestions, EmojiSelect } = emojiPlugin;

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
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(false);
  const controlPanelRef = useRef();
  const chatBoxRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [isEmojiShowing, setIsEmojiShowing] = useState<boolean>(false);
  const [peerAvatar, setPeerAvatar] = useState<Avatar>(icons[0]);
  const [editorState, setEditorState] = useState(() =>
    EditorState.createEmpty(),
  );
  const editorRef = useRef<any>();
  const testText = useRef('');

  // const [dataChannel, setDataChannel] = useState<RTCDataChannel>();
  let dataChannel = useRef<RTCDataChannel>();
  const avatar = useRef<Avatar>(icons[0]);

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

    const storedAvatar = localStorage.getItem('avatar');

    if (storedAvatar) {
      const parsedAvatar = JSON.parse(storedAvatar);
      if (parsedAvatar.title) {
        const icon = icons.find(icon => icon.title === parsedAvatar.title);
        console.log('StoredIcon', icon)
        if (icon) avatar.current = icon;
      }
    }


    WebSocketClient.ws.onerror = evt => {
      console.log(evt)
    };

    WebSocketClient.ws.onclose = evt => {
      console.log('Websocket Closing')
    };

    localVid.current.srcObject = localStream;
    remoteVid.current.srcObject = remoteStream.current;

    myPeerConnection.current.addEventListener('icecandidate', onPRIceCandidate);
    myPeerConnection.current.addEventListener('track', onPRTrack);
    myPeerConnection.current.addEventListener('negotiationneeded', onNegotiationNeeded);
    
    return () => {
    }
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
    dataChannel.current?.send(JSON.stringify({ type: 'end-video-call' }));
    endCall();
  };

  const endCall = () => {
    if (WebSocketClient.ws.readyState === WebSocket.OPEN) {
      WebSocketClient.ws.close();
    }

    props.history.push('/');
  }


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
    console.log('On Data Channel Open')
    if (WebSocketClient.ws.readyState === WebSocket.OPEN) {
      WebSocketClient.ws.close();
    }

    // Send the avatar to peer
    if (dataChannel.current) {
      dataChannel.current.send(JSON.stringify({ payload: { avatarTitle: avatar.current.title }, type: 'peer-avatar' }));
    }
  };

  const onDataChannelClose = (event: Event) => {
    endCall();
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
      case 'end-video-call':
        endCall();
        break;
      case 'peer-avatar':
        const peerAvatar = icons.find(icon => icon.title === payload.avatarTitle);
        if (peerAvatar) {
          console.log('peerAvatar', peerAvatar);
          setPeerAvatar(peerAvatar);
        }
        break;
      default:
        break;
    }
  };


  useEffect(() => {
    const childs = chatBoxRef.current.children;
    if (childs.length > 0) {
      const lastChild = childs[childs.length - 1];
      lastChild.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = () => {
    console.log(convertToRaw(editorState.getCurrentContent()))
    const currentContent = editorState.getCurrentContent()
    const { blocks } = convertToRaw(currentContent);
    const markup = blocks.map((block, index) => `${block.text}${index !== (blocks.length - 1) ? '\n' : ''}`);

    const text = markup.join('');
    console.log('text', text)
    if (text) {
      console.log('SendMessage', dataChannel);
      if (dataChannel.current) {
        const payload = {
          user: username,
          text,
          createdAt: new Date().toString()
        };
        switch (dataChannel.current.readyState) {
          case "connecting":
            console.log("Connection not open; queueing: ");
            // sendQueue.push(msg);
            break;
          case "open":
            // sendQueue.forEach((msg) => dataChannel.send(msg));
            setMessages(messages.concat(payload));
            const newEditorState = EditorState.push(editorState, ContentState.createFromText(''), 'remove-range');
            setEditorState(newEditorState);
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
    }
  };


  return (
    <div className="parent-container">
      <div className="room-container" onMouseEnter={() => {
        setIsControlPanelOpen(true);

        setTimeout(() => {
          if (controlPanelRef.current) {
            const { isOnFocusStatus }: any = controlPanelRef.current;
            console.log('IsOnFocusStataus', isOnFocusStatus())
            if (!isOnFocusStatus()) {
              setIsControlPanelOpen(false);
            }
          }
        }, 800);
      }}>
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
        <div style={{ display: 'grid', gridTemplateRows: '70% 30%' }}>
          <Comment.Group className='max-width-initial'>
            <Header as='h1' dividing>
              Chat
          </Header>

            <div ref={chatBoxRef} style={{ overflowY: 'scroll', maxHeight: '70vh' }}>
              {
                messages.map((message, messageIndex) => {
                  return (
                    <Comment key={messageIndex}>
                      <Comment.Avatar src={message.user === username ? avatar.current.src : peerAvatar.src} />
                      <Comment.Content>
                        <Comment.Author as='a'>{message.user === username ? 'You' : 'Stranger'}</Comment.Author>
                        <Comment.Metadata>
                          <div>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</div>
                        </Comment.Metadata>
                        <Comment.Text className='default-text'>{message.text}</Comment.Text>
                      </Comment.Content>
                    </Comment>
                  );
                })
              }
            </div>
          </Comment.Group>
          <div>
            <div onClick={() => editorRef.current.focus()}>
              <Editor
                editorState={editorState}
                onChange={setEditorState}
                plugins={[emojiPlugin]}
                ref={editorRef}

              />
              <EmojiSuggestions />

            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button content='Send' onClick={sendMessage} labelPosition='left' icon='edit' primary />
              < EmojiSelect />
            </div>
          </div>
        </div>
      </div>

      <div onMouseEnter={() => setIsControlPanelOpen(true)}>
        <Header as='h3' disabled textAlign='center'>
          Hover here to display the control panel
        </Header>
      </div>

      <ControlPanel
        ref={controlPanelRef}
        events={{ camera: cameraClicked, microphone: microphoneClicked, stop: stopClicked }}
        mediaStream={localStream}
        isOpen={isControlPanelOpen}
      />
    </div>
  );
}

interface Message {
  user: string,
  text: string,
  createdAt: string
}