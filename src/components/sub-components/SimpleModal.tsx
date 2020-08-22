import React, { forwardRef, useState, useImperativeHandle, Ref, useEffect } from "react";
import { Button, Modal, StrictModalProps } from 'semantic-ui-react'

function SimpleModal({ content, header, onCloseCb, onAcceptCb, options }: SimpleModalProps, ref: Ref<any>) {
  const [isOpen, setOpen] = useState<boolean>(false);

  const handles: SimpleModalHandles = {
    toggle: () => (setOpen(isOpen => !isOpen))
  };

  useImperativeHandle(ref, () => (handles));

  const cancel = () => {
    setOpen(false);
    if (onCloseCb) onCloseCb();
  };

  useEffect(() => {
    console.log('isOpen', isOpen)
  }, [isOpen])


  const accept = () => {
    setOpen(false);
    if (onAcceptCb) onAcceptCb();
  }

  return (
    <Modal size={options.size} open={isOpen} onClose={cancel}>
      {header ? <Modal.Header className="timer-modal-head">{header}</Modal.Header> : null}
      <Modal.Content>
        {content}
      </Modal.Content>
      <Modal.Actions>
        {/* If callback doesn't exists don't render the button */}
        {onAcceptCb ? <Button positive onClick={accept} content="Accept" /> : null}
        {onCloseCb ? <Button negative onClick={cancel} content="Cancel" /> : null}
      </Modal.Actions>
    </Modal>
  );
}

export default forwardRef(SimpleModal);

interface SimpleModalProps {
  content: JSX.Element,
  header?: string,
  onCloseCb?: Function,
  onAcceptCb?: Function,
  options: StrictModalProps
}

export interface SimpleModalHandles {
  toggle: Function
}