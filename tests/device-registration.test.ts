import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts
const mockContractState = {
  lastDeviceId: 0,
  devices: new Map(),
  hospitals: new Map(),
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Example principal
};

// Mock contract functions
const deviceRegistration = {
  registerHospital: (hospitalId, name, location, contact, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = { hospitalId };
    const value = { name, location, contact };
    
    if (mockContractState.hospitals.has(JSON.stringify(key))) {
      return { error: 409 }; // Conflict
    }
    
    mockContractState.hospitals.set(JSON.stringify(key), value);
    return { success: true };
  },
  
  registerDevice: (name, model, serialNumber, manufacturer, purchaseDate, warrantyExpiry, hospitalId, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const hospitalKey = JSON.stringify({ hospitalId });
    if (!mockContractState.hospitals.has(hospitalKey)) {
      return { error: 404 };
    }
    
    const newId = mockContractState.lastDeviceId + 1;
    const key = { deviceId: newId };
    const value = {
      name,
      model,
      serialNumber,
      manufacturer,
      purchaseDate,
      warrantyExpiry,
      hospitalId,
      status: 'active'
    };
    
    mockContractState.devices.set(JSON.stringify(key), value);
    mockContractState.lastDeviceId = newId;
    
    return { success: newId };
  },
  
  updateDeviceStatus: (deviceId, status, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = JSON.stringify({ deviceId });
    if (!mockContractState.devices.has(key)) {
      return { error: 404 };
    }
    
    const device = mockContractState.devices.get(key);
    device.status = status;
    mockContractState.devices.set(key, device);
    
    return { success: true };
  },
  
  getDevice: (deviceId) => {
    const key = JSON.stringify({ deviceId });
    return mockContractState.devices.get(key) || null;
  },
  
  getHospital: (hospitalId) => {
    const key = JSON.stringify({ hospitalId });
    return mockContractState.hospitals.get(key) || null;
  }
};

describe('Device Registration Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockContractState.lastDeviceId = 0;
    mockContractState.devices = new Map();
    mockContractState.hospitals = new Map();
  });
  
  it('should register a hospital successfully', () => {
    const result = deviceRegistration.registerHospital(
        1,
        'General Hospital',
        'New York',
        'contact@hospital.com',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    expect(mockContractState.hospitals.size).toBe(1);
    
    const hospital = deviceRegistration.getHospital(1);
    expect(hospital).toEqual({
      name: 'General Hospital',
      location: 'New York',
      contact: 'contact@hospital.com'
    });
  });
  
  it('should fail to register a hospital with unauthorized sender', () => {
    const result = deviceRegistration.registerHospital(
        1,
        'General Hospital',
        'New York',
        'contact@hospital.com',
        'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Different from contract owner
    );
    
    expect(result.error).toBe(403);
    expect(mockContractState.hospitals.size).toBe(0);
  });
  
  it('should register a device successfully', () => {
    // First register a hospital
    deviceRegistration.registerHospital(
        1,
        'General Hospital',
        'New York',
        'contact@hospital.com',
        mockContractState.contractOwner
    );
    
    const result = deviceRegistration.registerDevice(
        'MRI Scanner',
        'Model X',
        'SN12345',
        'Medical Devices Inc',
        1609459200, // Unix timestamp
        1672531200, // Unix timestamp
        1, // Hospital ID
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(1); // First device ID
    expect(mockContractState.devices.size).toBe(1);
    expect(mockContractState.lastDeviceId).toBe(1);
    
    const device = deviceRegistration.getDevice(1);
    expect(device).toEqual({
      name: 'MRI Scanner',
      model: 'Model X',
      serialNumber: 'SN12345',
      manufacturer: 'Medical Devices Inc',
      purchaseDate: 1609459200,
      warrantyExpiry: 1672531200,
      hospitalId: 1,
      status: 'active'
    });
  });
  
  it('should fail to register a device for non-existent hospital', () => {
    const result = deviceRegistration.registerDevice(
        'MRI Scanner',
        'Model X',
        'SN12345',
        'Medical Devices Inc',
        1609459200,
        1672531200,
        999, // Non-existent hospital ID
        mockContractState.contractOwner
    );
    
    expect(result.error).toBe(404);
    expect(mockContractState.devices.size).toBe(0);
  });
  
  it('should update device status successfully', () => {
    // Setup: register hospital and device
    deviceRegistration.registerHospital(
        1,
        'General Hospital',
        'New York',
        'contact@hospital.com',
        mockContractState.contractOwner
    );
    
    deviceRegistration.registerDevice(
        'MRI Scanner',
        'Model X',
        'SN12345',
        'Medical Devices Inc',
        1609459200,
        1672531200,
        1,
        mockContractState.contractOwner
    );
    
    const result = deviceRegistration.updateDeviceStatus(
        1, // Device ID
        'maintenance',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    
    const device = deviceRegistration.getDevice(1);
    expect(device.status).toBe('maintenance');
  });
});
