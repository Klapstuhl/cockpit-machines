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
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import cockpit from 'cockpit';

import {
    AlertGroup,
    Breadcrumb, BreadcrumbItem,
    CodeBlock, CodeBlockCode,
    Gallery, Button,
    List, ListItem,
    Card, CardTitle, CardActions, CardHeader, CardBody, CardFooter,
    Page, PageSection, PageSectionVariants,
    Popover,
} from '@patternfly/react-core';
import { ExpandIcon, HelpIcon } from '@patternfly/react-icons';

import { vmId } from "../../helpers.js";

import { VmFilesystemsCard, VmFilesystemActions } from './filesystems/vmFilesystemsCard.jsx';
import { VmDisksCardLibvirt, VmDisksActions } from './disks/vmDisksCard.jsx';
import { VmNetworkTab, VmNetworkActions } from './nics/vmNicsCard.jsx';
import { VmHostDevCard } from './hostdevs/hostDevCard.jsx';
import Consoles from './consoles/consoles.jsx';
import VmOverviewCard from './overview/vmOverviewCard.jsx';
import VmUsageTab from './vmUsageCard.jsx';
import { VmSnapshotsCard, VmSnapshotsActions } from './snapshots/vmSnapshotsCard.jsx';
import VmActions from './vmActions.jsx';

import './vmDetailsPage.scss';

const _ = cockpit.gettext;

export const VmDetailsPage = ({
    vm, vms, config, libvirtVersion, storagePools,
    onUsageStartPolling, onUsageStopPolling, networks,
    nodeDevices, notifications, onAddErrorNotification
}) => {
    useEffect(() => {
        // Anything in here is fired on component mount.
        onUsageStartPolling();
        return () => {
            // Anything in here is fired on component unmount.
            onUsageStopPolling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const vmActionsPageSection = (
        <PageSection variant={PageSectionVariants.light}>
            <div className="vm-top-panel" data-vm-transient={!vm.persistent}>
                <h2 className="vm-name">{vm.name}</h2>
                <VmActions vm={vm}
                           config={config}
                           storagePools={storagePools}
                           onAddErrorNotification={onAddErrorNotification}
                           isDetailsPage />
            </div>
            {notifications && <AlertGroup isToast>{notifications}</AlertGroup>}
        </PageSection>
    );

    if (cockpit.location.path[1] == "console") {
        return (
            <Page groupProps={{ sticky: 'top' }}
                  id={"vm-" + vm.name + "-consoles-page"}
                  isBreadcrumbGrouped
                  breadcrumb={
                      <Breadcrumb className='machines-listing-breadcrumb'>
                          <BreadcrumbItem to='#'>
                              {_("Virtual machines")}
                          </BreadcrumbItem>
                          <BreadcrumbItem onClick={() => cockpit.location.go(["vm"], Object.assign(cockpit.location.options, { name: vm.name, connection: vm.connectionName }))}>
                              <a className="pf-c-breadcrumb__link">{vm.name}</a>
                          </BreadcrumbItem>
                          <BreadcrumbItem isActive>
                              {_("Console")}
                          </BreadcrumbItem>
                      </Breadcrumb>}>
                {vmActionsPageSection}
                <PageSection variant={PageSectionVariants.light}>
                    <Consoles vm={vm} config={config}
                        onAddErrorNotification={onAddErrorNotification} />
                </PageSection>
            </Page>
        );
    }

    const cardContents = [
        {
            id: `${vmId(vm.name)}-overview`,
            title: _("Overview"),
            body: <VmOverviewCard vm={vm} config={config}
                                  nodeDevices={nodeDevices} libvirtVersion={libvirtVersion} />,
        },
        {
            id: `${vmId(vm.name)}-usage`,
            className: 'usage-card',
            title: _("Usage"),
            body: <VmUsageTab vm={vm} />,
        },
        {
            id: `${vmId(vm.name)}-consoles`,
            className: "consoles-card",
            title: _("Console"),
            actions: <Button variant="link"
                           isDisabled={vm.state == "shut off"}
                           onClick={() => {
                               const urlOptions = { name: vm.name, connection: vm.connectionName };
                               return cockpit.location.go(["vm", "console"], { ...cockpit.location.options, ...urlOptions });
                           }}
                           icon={<ExpandIcon />}
                           iconPosition="right">{_("Expand")}</Button>,
            body: <Consoles vm={vm} config={config}
                            onAddErrorNotification={onAddErrorNotification} />,
        },
        {
            id: `${vmId(vm.name)}-disks`,
            className: "disks-card",
            title: _("Disks"),
            actions: <VmDisksActions vm={vm} vms={vms} storagePools={storagePools} />,
            body: <VmDisksCardLibvirt vm={vm} config={config} storagePools={storagePools}
                                      onAddErrorNotification={onAddErrorNotification} />,
        },
        {
            id: `${vmId(vm.name)}-networks`,
            className: "networks-card",
            title: _("Networks"),
            actions: <VmNetworkActions vm={vm} networks={networks} />,
            body: <VmNetworkTab vm={vm} config={config}
                                networks={networks}
                                onAddErrorNotification={onAddErrorNotification} />,
        },
        {
            id: `${vmId(vm.name)}-hostdevs`,
            className: "hostdevs-card",
            title: _("Host devices"),
            body: <VmHostDevCard vm={vm} nodeDevices={nodeDevices} config={config} />,
        }
    ];
    if (vm.snapshots !== -1 && vm.snapshots !== undefined) {
        cardContents.push({
            id: cockpit.format("$0-snapshots", vmId(vm.name)),
            className: "snapshots-card",
            title: _("Snapshots"),
            actions: <VmSnapshotsActions vm={vm} />,
            body: <VmSnapshotsCard vm={vm} config={config}
                                   onAddErrorNotification={onAddErrorNotification} />
        });
    }
    if (libvirtVersion && libvirtVersion >= 6008000 && vm.connectionName == "system") {
        cardContents.push(
            {
                id: `${vmId(vm.name)}-filesystems`,
                className: "filesystems-card",
                title: (
                    <>
                        {_("Shared directories")}
                        <Popover
                            headerContent={_("Shared host directories need to be manually mounted inside the VM")}
                            bodyContent={
                                <CodeBlock>
                                    <CodeBlockCode>mount -t virtiofs [mount tag] [mount point]</CodeBlockCode>
                                </CodeBlock>
                            }
                            footerContent={
                                <List>
                                    <ListItem>{_("mount tag: The tag associated to the exported mount point")}</ListItem>
                                    <ListItem>{_("mount point: The mount point inside the guest")}</ListItem>
                                </List>
                            }
                            hasAutoWidth>
                            <Button variant="plain" aria-label={_("more info")}>
                                <HelpIcon />
                            </Button>
                        </Popover>
                    </>
                ),
                actions: <VmFilesystemActions connectionName={vm.connectionName}
                                              objPath={vm.id}
                                              vmName={vm.name}
                                              vmState={vm.state}
                                              memory={vm.memory}
                                              memoryBacking={vm.memoryBacking} />,
                body: <VmFilesystemsCard filesystems={vm.filesystems} vmName={vm.name} />
            }
        );
    }

    const cards = cardContents.map(card => {
        return (
            <Card key={card.id}
                  className={card.className}
                  id={card.id}>
                <CardHeader>
                    <CardTitle><h2>{card.title}</h2></CardTitle>
                    {card.actions && <CardActions>{card.actions}</CardActions>}
                </CardHeader>
                <CardBody className={["disks-card", "hostdevs-card", "networks-card", "snapshots-card", "filesystems-card"].includes(card.className) ? "contains-list" : ""}>
                    {card.body}
                </CardBody>
                <CardFooter />
            </Card>
        );
    });

    return (
        <Page id="vm-details" className="vm-details" breadcrumb={
            <Breadcrumb className='machines-listing-breadcrumb'>
                <BreadcrumbItem to='#'>
                    {_("Virtual machines")}
                </BreadcrumbItem>
                <BreadcrumbItem isActive>
                    {vm.name}
                </BreadcrumbItem>
            </Breadcrumb>}>
            {vmActionsPageSection}
            <PageSection>
                <Gallery className='ct-vm-overview' hasGutter>
                    {cards}
                </Gallery>
            </PageSection>
        </Page>
    );
};

VmDetailsPage.propTypes = {
    vm: PropTypes.object.isRequired,
    vms: PropTypes.array.isRequired,
    config: PropTypes.object.isRequired,
    libvirtVersion: PropTypes.number.isRequired,
    storagePools: PropTypes.array.isRequired,
    networks: PropTypes.array.isRequired,
    notifications: PropTypes.array,
    onAddErrorNotification: PropTypes.func.isRequired,
    nodeDevices: PropTypes.array.isRequired,
};
