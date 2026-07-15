/**
 * Asset Form Manager Module
 * Handles dynamic field display based on system type selection
 * 
 * System Types:
 * - AG: Shows AG-specific fields
 * - NCMC, QR, PINELAB, TVM: Show equipment fields
 */

class AssetFormManager {
    constructor(options = {}) {

    this.webAppUrl = "https://script.google.com/macros/s/AKfycbyC1UQzxp4ikxVpBbg5D0TJDxx4AU-iEqh4Z9Cigeb0HAUzNYnQGihpPPKi7QDC2pgb4A/exec";

    this.systemTypeSelector = options.systemTypeSelector || '#systemType';
    this.agFieldsSelector = options.agFieldsSelector || '#agFields';
    this.otherSystemFieldsSelector = options.otherSystemFieldsSelector || '#otherSystemFields';
    this.formSelector = options.formSelector || '#assetForm';

    this.systemTypeSelect = document.querySelector(this.systemTypeSelector);
    this.agFieldsSection = document.querySelector(this.agFieldsSelector);
    this.otherSystemFieldsSection = document.querySelector(this.otherSystemFieldsSelector);
    this.form = document.querySelector(this.formSelector);

    this.agSystemType = 'AG';
    this.otherSystemTypes = ['NCMC', 'QR', 'PINELAB', 'TVM'];

    this.init();
}

    /**
     * Initialize event listeners
     */
    init() {
        if (this.systemTypeSelect) {
            this.systemTypeSelect.addEventListener('change', () => this.handleSystemTypeChange());
        }

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Initial state
        this.handleSystemTypeChange();
    }

    /**
     * Handle system type change
     */
    handleSystemTypeChange() {
        const selectedValue = this.systemTypeSelect.value;

        // Remove active class from all sections
        this.agFieldsSection?.classList.remove('active');
        this.otherSystemFieldsSection?.classList.remove('active');

        // Show appropriate section
        if (selectedValue === this.agSystemType) {
            this.agFieldsSection?.classList.add('active');
            this.clearFields('other');
        } else if (this.otherSystemTypes.includes(selectedValue)) {
            this.otherSystemFieldsSection?.classList.add('active');
            this.clearFields('ag');
        } else {
            this.clearFields('all');
        }
    }

    /**
     * Clear form fields
     * @param {string} type - 'ag', 'other', or 'all'
     */
    clearFields(type) {
        if (type === 'ag' || type === 'all') {
            this.agFieldsSection?.querySelectorAll('input, select, textarea').forEach(field => {
                this.resetField(field);
            });
        }

        if (type === 'other' || type === 'all') {
            this.otherSystemFieldsSection?.querySelectorAll('input, select, textarea').forEach(field => {
                this.resetField(field);
            });
        }
    }

    /**
     * Reset individual field
     * @param {HTMLElement} field
     */
    resetField(field) {
        if (field.type === 'text' || field.type === 'date' || field.tagName === 'TEXTAREA') {
            field.value = '';
        } else if (field.tagName === 'SELECT') {
            field.selectedIndex = 0;
        }
    }

    /**
     * Get AG form data
     * @returns {Object}
     */
    getAGFormData() {
        return {
            systemType: this.systemTypeSelect.value,
            assetId: this.getFieldValue('assetId_ag'),
            equipmentType: this.getFieldValue('equipmentType_ag'),
            station: this.getFieldValue('station_ag'),
            deviceId: this.getFieldValue('deviceId_ag'),
            direction: this.getFieldValue('direction_ag'),
            entryScannerID: this.getFieldValue('entryScannerID_ag'),
            exitScannerID: this.getFieldValue('exitScannerID_ag'),
            entryReaderID: this.getFieldValue('entryReaderID_ag'),
            exitReaderID: this.getFieldValue('exitReaderID_ag'),
            wideNormal: this.getFieldValue('wideNormal_ag'),
            newOld: this.getFieldValue('newOld_ag'),
            remark: this.getFieldValue('agRemark')
        };
    }

    /**
     * Get other system form data
     * @returns {Object}
     */
    getOtherSystemFormData() {
        return {
            systemType: this.systemTypeSelect.value,
            assetId: this.getFieldValue('assetId_other'),
            equipmentType: this.getFieldValue('equipmentType_other'),
            equipmentName: this.getFieldValue('equipmentName_other'),
            serialNumber: this.getFieldValue('serialNumber_other'),
            manufacturer: this.getFieldValue('manufacturer_other'),
            model: this.getFieldValue('model_other'),
            station: this.getFieldValue('station_other'),
            status: this.getFieldValue('status_other'),
            condition: this.getFieldValue('condition_other'),
            installDate: this.getFieldValue('installDate_other'),
            remarks: this.getFieldValue('remarks_other')
        };
    }

    /**
     * Get field value by ID
     * @param {string} fieldId
     * @returns {string}
     */
    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : '';
    }

    /**
     * Handle form submission
     * @param {Event} e
     */
    handleFormSubmit(e) {
        e.preventDefault();

        const selectedSystem = this.systemTypeSelect.value;

        if (!selectedSystem) {
            alert('Please select a system type');
            return;
        }

        let formData;

        if (selectedSystem === this.agSystemType) {
            formData = this.getAGFormData();
        } else {
            formData = this.getOtherSystemFormData();
        }

        // Add timestamp
        formData.timestamp = new Date().toISOString();

        // Validate required fields
        if (!this.validateFormData(formData)) {
            return;
        }

        // Call custom callback if provided
        if (this.onSubmit) {
            this.onSubmit(formData);
        } else {
            // Default behavior
            this.handleDefaultSubmit(formData);
        }
    }

    /**
     * Validate form data
     * @param {Object} data
     * @returns {boolean}
     */
    validateFormData(data) {
        const requiredFields = ['assetId', 'equipmentType', 'station'];
        
        for (let field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                alert(`Please fill in the ${field} field`);
                return false;
            }
        }

        return true;
    }

    /**
     * Handle default form submission
     * @param {Object} formData
     */
    /**
 * Handle default form submission
 * @param {Object} formData
 */
async handleDefaultSubmit(formData) {

    try {

        const response = await fetch(this.webAppUrl, {
    method: "POST",
    mode: "cors",
    headers: {
        "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
        action: "add",
        ...formData
    })
});

        const text = await response.text();
        const result = JSON.parse(text);

        if (result.success) {

            alert("Asset saved successfully.");

            console.log(result);

            this.resetForm();

        } else {

            alert(result.message || result.error || "Failed to save asset.");

        }

    } catch (err) {

        console.error(err);

        alert(err.message);

    }

}

    /**
     * Set custom submit callback
     * @param {Function} callback
     */
    setOnSubmit(callback) {
        this.onSubmit = callback;
    }

    /**
     * Reset form
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
            this.systemTypeSelect.value = '';
            this.handleSystemTypeChange();
        }
    }

    /**
     * Populate form with data
     * @param {Object} data
     * @param {string} systemType
     */
    populateForm(data, systemType) {
        this.systemTypeSelect.value = systemType;
        this.handleSystemTypeChange();

        if (systemType === this.agSystemType) {
            this.populateAGFields(data);
        } else {
            this.populateOtherSystemFields(data);
        }
    }

    /**
     * Populate AG fields
     * @param {Object} data
     */
    populateAGFields(data) {
        const fieldMapping = {
            assetId: 'assetId_ag',
            equipmentType: 'equipmentType_ag',
            station: 'station_ag',
            deviceId: 'deviceId_ag',
            direction: 'direction_ag',
            entryScannerID: 'entryScannerID_ag',
            exitScannerID: 'exitScannerID_ag',
            entryReaderID: 'entryReaderID_ag',
            exitReaderID: 'exitReaderID_ag',
            wideNormal: 'wideNormal_ag',
            newOld: 'newOld_ag',
            remark: 'agRemark'
        };

        this.populateFieldsWithMapping(data, fieldMapping);
    }

    /**
     * Populate other system fields
     * @param {Object} data
     */
    populateOtherSystemFields(data) {
        const fieldMapping = {
            assetId: 'assetId_other',
            equipmentType: 'equipmentType_other',
            equipmentName: 'equipmentName_other',
            serialNumber: 'serialNumber_other',
            manufacturer: 'manufacturer_other',
            model: 'model_other',
            station: 'station_other',
            status: 'status_other',
            condition: 'condition_other',
            installDate: 'installDate_other',
            remarks: 'remarks_other'
        };

        this.populateFieldsWithMapping(data, fieldMapping);
    }

    /**
     * Populate fields using mapping
     * @param {Object} data
     * @param {Object} mapping
     */
    populateFieldsWithMapping(data, mapping) {
        Object.keys(mapping).forEach(dataKey => {
            if (data.hasOwnProperty(dataKey)) {
                const fieldId = mapping[dataKey];
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = data[dataKey];
                }
            }
        });
    }

    /**
     * Get all form data
     * @returns {Object}
     */
    getAllFormData() {
        const selectedSystem = this.systemTypeSelect.value;

        if (selectedSystem === this.agSystemType) {
            return this.getAGFormData();
        } else {
            return this.getOtherSystemFormData();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetFormManager;
}
