import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts
const mockContractState = {
  lastTechnicianId: 0,
  technicians: new Map(),
  qualifications: new Map(),
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Example principal
};

// Mock contract functions
const technicianVerification = {
  registerTechnician: (name, contact, certificationDate, certificationExpiry, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const newId = mockContractState.lastTechnicianId + 1;
    const key = { technicianId: newId };
    const value = {
      name,
      contact,
      certificationDate,
      certificationExpiry,
      status: 'active'
    };
    
    mockContractState.technicians.set(JSON.stringify(key), value);
    mockContractState.lastTechnicianId = newId;
    
    return { success: newId };
  },
  
  addQualification: (technicianId, deviceType, certificationLevel, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const techKey = JSON.stringify({ technicianId });
    if (!mockContractState.technicians.has(techKey)) {
      return { error: 404 };
    }
    
    const key = JSON.stringify({ technicianId, deviceType });
    const value = {
      certificationLevel,
      verified: false
    };
    
    mockContractState.qualifications.set(key, value);
    
    return { success: true };
  },
  
  verifyQualification: (technicianId, deviceType, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = JSON.stringify({ technicianId, deviceType });
    if (!mockContractState.qualifications.has(key)) {
      return { error: 404 };
    }
    
    const qualification = mockContractState.qualifications.get(key);
    qualification.verified = true;
    mockContractState.qualifications.set(key, qualification);
    
    return { success: true };
  },
  
  updateTechnicianStatus: (technicianId, status, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = JSON.stringify({ technicianId });
    if (!mockContractState.technicians.has(key)) {
      return { error: 404 };
    }
    
    const technician = mockContractState.technicians.get(key);
    technician.status = status;
    mockContractState.technicians.set(key, technician);
    
    return { success: true };
  },
  
  isQualified: (technicianId, deviceType) => {
    const qualKey = JSON.stringify({ technicianId, deviceType });
    const techKey = JSON.stringify({ technicianId });
    
    if (!mockContractState.qualifications.has(qualKey) || !mockContractState.technicians.has(techKey)) {
      return false;
    }
    
    const qualification = mockContractState.qualifications.get(qualKey);
    const technician = mockContractState.technicians.get(techKey);
    
    return qualification.verified && technician.status === 'active';
  },
  
  getTechnician: (technicianId) => {
    const key = JSON.stringify({ technicianId });
    return mockContractState.technicians.get(key) || null;
  },
  
  getQualification: (technicianId, deviceType) => {
    const key = JSON.stringify({ technicianId, deviceType });
    return mockContractState.qualifications.get(key) || null;
  }
};

describe('Technician Verification Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockContractState.lastTechnicianId = 0;
    mockContractState.technicians = new Map();
    mockContractState.qualifications = new Map();
  });
  
  it('should register a technician successfully', () => {
    const result = technicianVerification.registerTechnician(
        'John Doe',
        'john@example.com',
        1609459200, // Certification date
        1672531200, // Expiry date
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(1); // First technician ID
    expect(mockContractState.technicians.size).toBe(1);
    
    const technician = technicianVerification.getTechnician(1);
    expect(technician).toEqual({
      name: 'John Doe',
      contact: 'john@example.com',
      certificationDate: 1609459200,
      certificationExpiry: 1672531200,
      status: 'active'
    });
  });
  
  it('should add qualification successfully', () => {
    // First register a technician
    technicianVerification.registerTechnician(
        'John Doe',
        'john@example.com',
        1609459200,
        1672531200,
        mockContractState.contractOwner
    );
    
    const result = technicianVerification.addQualification(
        1, // Technician ID
        'MRI Scanner',
        'Expert',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    
    const qualification = technicianVerification.getQualification(1, 'MRI Scanner');
    expect(qualification).toEqual({
      certificationLevel: 'Expert',
      verified: false
    });
  });
  
  it('should verify qualification successfully', () => {
    // Setup: register technician and add qualification
    technicianVerification.registerTechnician(
        'John Doe',
        'john@example.com',
        1609459200,
        1672531200,
        mockContractState.contractOwner
    );
    
    technicianVerification.addQualification(
        1,
        'MRI Scanner',
        'Expert',
        mockContractState.contractOwner
    );
    
    const result = technicianVerification.verifyQualification(
        1,
        'MRI Scanner',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    
    const qualification = technicianVerification.getQualification(1, 'MRI Scanner');
    expect(qualification.verified).toBe(true);
  });
  
  it('should correctly determine if a technician is qualified', () => {
    // Setup: register technician, add and verify qualification
    technicianVerification.registerTechnician(
        'John Doe',
        'john@example.com',
        1609459200,
        1672531200,
        mockContractState.contractOwner
    );
    
    technicianVerification.addQualification(
        1,
        'MRI Scanner',
        'Expert',
        mockContractState.contractOwner
    );
    
    technicianVerification.verifyQualification(
        1,
        'MRI Scanner',
        mockContractState.contractOwner
    );
    
    // Test qualified technician
    expect(technicianVerification.isQualified(1, 'MRI Scanner')).toBe(true);
    
    // Test unverified qualification
    technicianVerification.addQualification(
        1,
        'CT Scanner',
        'Beginner',
        mockContractState.contractOwner
    );
    expect(technicianVerification.isQualified(1, 'CT Scanner')).toBe(false);
    
    // Test inactive technician
    technicianVerification.updateTechnicianStatus(
        1,
        'inactive',
        mockContractState.contractOwner
    );
    expect(technicianVerification.isQualified(1, 'MRI Scanner')).toBe(false);
  });
});
