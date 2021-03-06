import React from 'react'
import Common from 'Common'

const { Dialog } = Common.components.modal
const { ModalUtil } = Common.util

const UpdatedModuleDialog = ({ onConfirm }) => (
	<Dialog
		preventEsc
		width="32rem"
		title="Updated Module"
		buttons={[
			{
				value: 'Close Dialog',
				altAction: true,
				default: true,
				onClick: ModalUtil.hide
			},
			{
				value: 'Restart',
				onClick: onConfirm
			}
		]}
	>
		<p>A portion of this module was just updated and unfortunately has to be restarted.</p>
		<p>Click close dialog to review and catalog your answers.</p>
		<p>When you&apos;re ready, click restart to start a new attempt with the updated module</p>
	</Dialog>
)

export default UpdatedModuleDialog
