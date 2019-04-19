/**
 Form file Upload reusable component / with validations of file extensions,
 size. Ability to enable/disable, give dynamic labels, and multiple files uploading ability.
 Enhanced with drag and drop functionality.

 Customizing the validation messages by giving a prop in a following format.

 [fileFormats] prop must have a structure like -> [".csv", ".doc"]
 [accepts] prop must be a string like -> ".csv,.doc" // const accepts = fileFormats.join(",")

 validationMessages = {
	"invalidFormat": "Error message in case of format error",
	"invalidSize": "Error message in case of size error"
}
 */

import React, {Component} from 'react';
import PropTypes from "prop-types";
import classNames from "classnames";
import FormInfo from "./FormInfo.jsx";
import { Button } from "ui-components";

const initialValidations = {
    status: "",
    statusMessage: ""
};

class FormFileUpload extends Component {
    constructor (props) {
        super(props);
        this.state = {
            fileName: "",
            ...initialValidations,
            clearUpload: false,
            fileId: "",
            disabled: false
        };
        this.getId = this.getId.bind(this);
        this.validate = this.validate.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.onFileChange = this.onFileChange.bind(this);
        this.clearUpload = this.clearUpload.bind(this);
        this.validateMultipleFiles = this.validateMultipleFiles.bind(this);
    }

    clearUpload () {
        this.props.onFileChange(null, initialValidations);
        this.setState({
            clearUpload: false,
            fileName: "",
            ...initialValidations
        });
    }

    validate (files, fileFormats, maxFileSize) {
        let validations = {};
        const {validationMessages} = this.props;
        const fileName = files.name;
        const size = files.size;
        const extension = "." + fileName.split(".").pop(); // to fix the case when the filename might contain "." besides its extension, for example "some.file.txt"
        switch(true) {
            case fileFormats.indexOf(extension) < 0: {
                validations["statusMessage"] = validationMessages.invalidFormat;
                validations.status = "error";
                break;
            }
            case size > maxFileSize: {
                validations["statusMessage"] = validationMessages.invalidSize;
                validations.status = "error";
                break;
            }
            default: {
                validations["statusMessage"] = "";
                validations.status = "";
            }
        }
        return {validations, fileName};
    }

    validateMultipleFiles (files) {
        const {fileFormats} = this.props;
        let fileNames = "", validationResult = {}, comma = "";
        let {maxFileSize} = this.props;
        // maxFileSize in bytes - 10485760 bytes = 10mb
        maxFileSize = maxFileSize || 10485760;
        for (let i = 0; i < files.length; i++) {
            comma = i > 0 ? "," : "";
            validationResult = this.validate(files[i], fileFormats, maxFileSize);
            fileNames = `${fileNames}${comma}${validationResult.fileName}`;
            if (validationResult.validations.status) {
                this.setState({
                    ...validationResult.validations,
                    clearUpload: true
                });
                this.props.onFileChange(files, validationResult.validations);
            }
        }
        if (!validationResult.validations.status) {
            this.setState({
                ...initialValidations
            });
            this.props.onFileChange(files, initialValidations);
        }
        this.setState({
            fileName: fileNames,
            clearUpload: true
        });
    }

    onFileChange (e) {
        e.preventDefault();
        e.stopPropagation();
        const files = e.target.files;
        const disabled = this.props.disabled;
        if (files && (files.length === 1 || (files.length > 1 && this.props.multiple)) && !disabled) {
            this.validateMultipleFiles(files);
        }
    }

    getId() {
        //generates random id and pass to jsx element as a "key", in order to clear its value
        const num = Math.floor(Math.random() * 1024);
        return num.toString();
    }

    static onDragOver (e) {
        e.preventDefault();
    }

    static onDragLeave (e) {
        e.preventDefault();
    }

    onDrop (e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        const disabled = this.props.disabled;
        if (files && (files.length === 1 || (files.length > 1 && this.props.multiple)) && !disabled) {
            this.validateMultipleFiles(files);
        }
    }
	
    render () {
             const id = this.getId(); // we need an id for file selector to work
             const {
                 btnLabel,
                 label,
                 multiple,
                 className,
                 accept,
                 disabled,
                 infoPlaceholder
             } = this.props;
             const {
                 statusMessage,
                 status,
                 dragdrop,
                 clearUpload,
                 fileName,
                 fileId
             } = this.state;
        return (
            <div className={classNames("form-group",  {
                "has-input": true,
                "is-disabled": disabled,
                "has-dragdrop": dragdrop,
                ["has-" + status]: status
            })}>
                {label ? <label>{label}</label> : null}
                <div className={classNames("form-control-wrapper", className)} draggable={true}
                     onDragOver = {FormFileUpload.onDragOver}
                     onDragLeave = {FormFileUpload.onDragLeave}
                     onDrop = {this.onDrop}>
                    <div className={classNames("form-control file-control", "")}>
                        <input type="file"
                               className="file-control__file-input"
                               id={"upload_" + id}
                               name={name}
                               accept={accept}
                               multiple={multiple}
                               onChange={this.onFileChange}
                               key = {id}
                               onLoad={this.onLoadStart}
                               disabled={disabled} />

                        <input className="file-id" type="hidden" name={"file_" + id} value={fileId} />
                       {clearUpload ?
                        <Button className="file-control__file-remove"
                                styleType="clear dark"
                                icon="close"
                                onClick={this.clearUpload}/> : <label className={classNames("file-control__file-label btn btn-primary",{disabled})}
                                                                      htmlFor={"upload_" + id}>{btnLabel}</label>
                        }
                        <span className="file-control__file-name">{fileName}</span>
                    </div>
                </div>
                {infoPlaceholder && !status && <FormInfo text={infoPlaceholder} />}
                <FormInfo state={status} text={statusMessage} />
            </div>
        );
    }
}

FormFileUpload.defaultProps = {
    btnLabel: "Choose file...",
    validationMessages: {
        "invalidFormat": "Invalid file format. Upload is not allowed.",
        "invalidSize": "File size is too big."
    }
};

FormFileUpload.propTypes = {
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    multiple: PropTypes.bool,
    onFileChange: PropTypes.func,
    label: PropTypes.string,
    className: PropTypes.string,
    fileFormats: PropTypes.array,
    accept: PropTypes.string,
    btnLabel: PropTypes.string,
    infoPlaceholder: PropTypes.string,
    maxFileSize: PropTypes.number,
    validationMessages: PropTypes.shape({
        invalidFormat: PropTypes.string,
        invalidSize: PropTypes.string
    }),

};
export default FormFileUpload;