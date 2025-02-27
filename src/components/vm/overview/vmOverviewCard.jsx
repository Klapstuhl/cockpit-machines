/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */
import React from 'react';
import PropTypes from 'prop-types';
import cockpit from 'cockpit';
import {
    Button, Text, TextVariants, Tooltip,
    DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
    Flex, FlexItem
} from "@patternfly/react-core";

import { VCPUModal } from './vcpuModal.jsx';
import { CPUTypeModal } from './cpuTypeModal.jsx';
import MemoryModal from './memoryModal.jsx';
import {
    rephraseUI,
    vmId
} from '../../../helpers.js';
import { updateVm } from '../../../actions/store-actions.js';
import { BootOrderLink } from './bootOrder.jsx';
import { FirmwareLink } from './firmware.jsx';
import WarningInactive from '../../common/warningInactive.jsx';
import { StateIcon } from '../../common/stateIcon.jsx';
import { changeVmAutostart, getDomainCapabilities, getVm } from '../../../libvirt-dbus.js';
import {
    getDomainCapLoader,
    getDomainCapMaxVCPU,
    getDomainCapCPUCustomModels,
    getDomainCapCPUHostModel,
} from '../../../libvirt-common.js';
import store from '../../../store.js';

import '../../common/overviewCard.css';

const _ = cockpit.gettext;

class VmOverviewCard extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            runningVmUpdated: false,
            showVcpuModal: false,
            showCpuTypeModal: false,
            showMemoryModal: false,
            cpuModels: [],
            virtXMLAvailable: undefined,
        };
        this.openVcpu = this.openVcpu.bind(this);
        this.openCpuType = this.openCpuType.bind(this);
        this.openMemory = this.openMemory.bind(this);
        this.close = this.close.bind(this);
        this.onAutostartChanged = this.onAutostartChanged.bind(this);
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    componentDidMount() {
        this._isMounted = true;
        getDomainCapabilities(this.props.vm.connectionName, this.props.vm.arch, this.props.vm.emulatedMachine)
                .done(domCaps => {
                    const loaderElems = getDomainCapLoader(domCaps);
                    const maxVcpu = getDomainCapMaxVCPU(domCaps);
                    const cpuModels = getDomainCapCPUCustomModels(domCaps);
                    const cpuHostModel = getDomainCapCPUHostModel(domCaps);

                    if (this._isMounted)
                        this.setState({ loaderElems, maxVcpu: Number(maxVcpu), cpuModels, cpuHostModel });
                })
                .fail(() => console.warn("getDomainCapabilities failed"));

        cockpit.spawn(['which', 'virt-xml'], { err: 'ignore' })
                .then(() => {
                    this.setState({ virtXMLAvailable: true });
                }, () => this.setState({ virtXMLAvailable: false }));
    }

    onAutostartChanged() {
        const { vm } = this.props;
        const autostart = !vm.autostart;

        changeVmAutostart({ connectionName: vm.connectionName, vmName: vm.name, autostart: autostart })
                .then(() => {
                    getVm({ connectionName: vm.connectionName, id: vm.id });
                });
    }

    close() {
        this.setState({ showVcpuModal: false, showCpuTypeModal: false, showMemoryModal: false });
    }

    openVcpu() {
        this.setState({ showVcpuModal: true });
    }

    openCpuType() {
        this.setState({ showCpuTypeModal: true });
    }

    openMemory() {
        this.setState({ showMemoryModal: true });
    }

    render() {
        const { vm, config, nodeDevices, libvirtVersion } = this.props;
        const idPrefix = vmId(vm.name);

        const vcpusChanged = (vm.vcpus.count !== vm.inactiveXML.vcpus.count) ||
                             (vm.vcpus.max !== vm.inactiveXML.vcpus.max) ||
                             (vm.cpu.sockets !== vm.inactiveXML.cpu.sockets) ||
                             (vm.cpu.threads !== vm.inactiveXML.cpu.threads) ||
                             (vm.cpu.cores !== vm.inactiveXML.cpu.cores);

        /* The live xml shows what host-model expanded to when started
         * This is important since the expansion varies depending on the host and so needs to be tracked across migration
         */
        let cpuModeChanged = false;
        if (vm.inactiveXML.cpu.mode == 'host-model')
            cpuModeChanged = !(vm.cpu.mode == 'host-model' || vm.cpu.model == this.state.cpuHostModel);
        else if (vm.inactiveXML.cpu.mode == 'host-passthrough')
            cpuModeChanged = vm.cpu.mode != 'host-passthrough';
        else if (vm.inactiveXML.cpu.mode == 'custom')
            cpuModeChanged = vm.cpu.mode !== 'custom' || vm.cpu.model !== vm.inactiveXML.cpu.model;

        const autostart = (
            <DescriptionListDescription>
                <label className='checkbox-inline'>
                    <input id={`${idPrefix}-autostart-checkbox`}
                        type="checkbox"
                        checked={vm.autostart}
                        onChange={this.onAutostartChanged} />
                    {_("Run when host boots")}
                </label>
            </DescriptionListDescription>
        );
        const memoryLink = (
            <DescriptionListDescription id={`${idPrefix}-memory-count`}>
                {cockpit.format_bytes(vm.currentMemory * 1024)}
                <Button variant="link" className="edit-inline" isInline isDisabled={!vm.persistent} onClick={this.openMemory}>
                    {_("edit")}
                </Button>
            </DescriptionListDescription>
        );
        const vcpuLink = (
            <DescriptionListDescription id={`${idPrefix}-vcpus-count`}>
                {vm.vcpus.count}
                { vm.persistent && vm.state === "running" && vcpusChanged && <WarningInactive iconId="vcpus-tooltip" tooltipId="tip-vcpus" /> }
                <Button variant="link" className="edit-inline" isInline isDisabled={!vm.persistent} onClick={this.openVcpu}>
                    {_("edit")}
                </Button>
            </DescriptionListDescription>
        );

        let cpuEditButton = (
            <Button variant="link" className="edit-inline" isInline isAriaDisabled={!vm.persistent || !this.state.virtXMLAvailable} onClick={this.openCpuType}>
                {_("edit")}
            </Button>
        );
        if (!this.state.virtXMLAvailable) {
            cpuEditButton = (
                <Tooltip id='virt-install-missing'
                         content={_("virt-install package needs to be installed on the system in order to edit this attribute")}>
                    {cpuEditButton}
                </Tooltip>
            );
        }
        const vmCpuType = (
            <DescriptionListDescription id={`${idPrefix}-cpu-model`}>
                {rephraseUI('cpuMode', vm.cpu.mode) + (vm.cpu.model ? ` (${vm.cpu.model})` : '')}
                { vm.persistent && vm.state === "running" && cpuModeChanged && <WarningInactive iconId="cpu-tooltip" tooltipId="tip-cpu" /> }
                { cpuEditButton }
            </DescriptionListDescription>
        );

        return (
            <>
                <Flex className="overview-tab" direction={{ default:"column", "2xl": "row" }}>
                    <FlexItem>
                        <DescriptionList isHorizontal>
                            <Text component={TextVariants.h4}>
                                {_("General")}
                            </Text>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("State")}</DescriptionListTerm>
                                <DescriptionListDescription>
                                    <StateIcon error={vm.error}
                                               state={vm.state}
                                               valueId={`${idPrefix}-state`}
                                               dismissError={() => store.dispatch(updateVm({
                                                   connectionName: vm.connectionName,
                                                   name: vm.name,
                                                   error: null
                                               }))} />
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Memory")}</DescriptionListTerm>
                                {memoryLink}
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("vCPUs")}</DescriptionListTerm>
                                {vcpuLink}
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("CPU type")}</DescriptionListTerm>
                                {vmCpuType}
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Boot order")}</DescriptionListTerm>
                                <DescriptionListDescription id={`${idPrefix}-boot-order`}>
                                    <BootOrderLink vm={vm} idPrefix={idPrefix}
                                                   close={this.close}
                                                   nodeDevices={nodeDevices} />
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            {vm.persistent && <DescriptionListGroup>
                                <DescriptionListTerm>{_("Autostart")}</DescriptionListTerm>
                                {autostart}
                            </DescriptionListGroup>}
                        </DescriptionList>
                    </FlexItem>
                    <FlexItem>
                        <DescriptionList isHorizontal>
                            <Text component={TextVariants.h4}>
                                {_("Hypervisor details")}
                            </Text>

                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Emulated machine")}</DescriptionListTerm>
                                <DescriptionListDescription id={`${idPrefix}-emulated-machine`}>{vm.emulatedMachine}</DescriptionListDescription>
                            </DescriptionListGroup>

                            { this.state.loaderElems && libvirtVersion >= 5002000 && // <os firmware=[bios/efi]' settings is available only for libvirt version >= 5.2. Before that version it silently ignores this attribute in the XML
                            <DescriptionListGroup>
                                <DescriptionListTerm>{_("Firmware")}</DescriptionListTerm>
                                <FirmwareLink vm={vm}
                                              loaderElems={this.state.loaderElems}
                                              libvirtVersion={libvirtVersion}
                                              idPrefix={idPrefix} />
                            </DescriptionListGroup>}
                        </DescriptionList>
                    </FlexItem>
                </Flex>
                { this.state.showMemoryModal && <MemoryModal close={this.close} vm={vm} config={config} /> }
                { this.state.showVcpuModal && <VCPUModal close={this.close} vm={vm} maxVcpu={this.state.maxVcpu} /> }
                { this.state.showCpuTypeModal && <CPUTypeModal close={this.close} vm={vm} models={this.state.cpuModels} /> }
            </>
        );
    }
}

VmOverviewCard.propTypes = {
    vm: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    libvirtVersion: PropTypes.number.isRequired,
    nodeDevices: PropTypes.array.isRequired,
};

export default VmOverviewCard;
