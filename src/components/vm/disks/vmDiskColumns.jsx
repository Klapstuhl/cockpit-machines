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

const _ = cockpit.gettext;

export const DiskSourceCell = ({ diskSource, idPrefix }) => {
    const addOptional = (chunks, value, type, descr) => {
        if (value) {
            chunks.push(
                <div className='machines-multivalue-column' key={descr}>
                    <strong className='machines-multivalue-column-label'>
                        {descr}
                    </strong>
                    <span className='machines-multivalue-column-value' id={`${idPrefix}-source-${type}`}>
                        {value}
                    </span>
                </div>
            );
        }
    };

    const chunks = [];
    addOptional(chunks, diskSource.file, "file", _("File"));
    addOptional(chunks, diskSource.dev, "device", _("Device"));
    addOptional(chunks, diskSource.protocol, "protocol", _("Protocol"));
    addOptional(chunks, diskSource.pool, "pool", _("Pool"));
    addOptional(chunks, diskSource.volume, "volume", _("Volume"));
    addOptional(chunks, diskSource.host.name, "host", _("Host"));
    addOptional(chunks, diskSource.host.port, "port", _("Port"));

    return chunks;
};

DiskSourceCell.propTypes = {
    diskSource: PropTypes.object.isRequired,
    idPrefix: PropTypes.string.isRequired,
};

export const DiskExtras = ({ idPrefix, cache, io, discard, errorPolicy }) => {
    const addOptional = (chunks, value, type, descr) => {
        if (value) {
            chunks.push(
                <div className='ct-form' key={descr}>
                    <label htmlFor={`${idPrefix}-${type}`} className='control-label'>
                        {descr}
                    </label>
                    <div id={`${idPrefix}-${type}`}>
                        {value}
                    </div>
                </div>
            );
        }
    };

    const chunks = [];
    addOptional(chunks, cache, "cache", _("Cache"));

    return chunks;
};

DiskExtras.propTypes = {
    cache: PropTypes.string,
    io: PropTypes.string,
    discard: PropTypes.string,
    errorPolicy: PropTypes.string,
    idPrefix: PropTypes.string.isRequired,
};
