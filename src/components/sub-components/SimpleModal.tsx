import React, { forwardRef, useState, useImperativeHandle, Ref } from "react";
import { Link } from 'react-router-dom';
import { Button, Modal, StrictModalProps } from 'semantic-ui-react'

function SimpleModal({ content, header, onCloseCb, options }: SimpleModalProps, ref: Ref<any>) {
  const [isOpen, setOpen] = useState<boolean>(false);

  const handles: SimpleModalHandles = {
    toggle: () => ( setOpen(isOpen => !isOpen ))
  };

  useImperativeHandle(ref, () => (handles));

  const cancelQueue = () => {
    setOpen(false);
    onCloseCb();
  };

  return (
    <Modal size={options.size} open={isOpen} onClose={cancelQueue}>
      <Modal.Header className="timer-modal-head">{header}</Modal.Header>
      <Modal.Content>
        <p>{content}</p>
      </Modal.Content>
      <Modal.Actions>
        <Button negative onClick={cancelQueue} content="Cancel" />
      </Modal.Actions>
    </Modal>
  );
}

export default forwardRef(SimpleModal);

interface SimpleModalProps {
  content: string,
  header: string,
  onCloseCb: Function,
  options: StrictModalProps
}

export interface SimpleModalHandles {
  toggle: Function
}