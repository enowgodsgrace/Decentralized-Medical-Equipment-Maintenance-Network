;; Technician Verification Contract
;; Validates qualifications for specific devices

(define-data-var last-technician-id uint u0)

;; Define the technician structure
(define-map technicians
  { technician-id: uint }
  {
    name: (string-ascii 100),
    contact: (string-ascii 100),
    certification-date: uint,
    certification-expiry: uint,
    status: (string-ascii 20)
  }
)

;; Define technician qualifications for specific device types
(define-map qualifications
  { technician-id: uint, device-type: (string-ascii 50) }
  {
    certification-level: (string-ascii 20),
    verified: bool
  }
)

;; Register a new technician
(define-public (register-technician
                (name (string-ascii 100))
                (contact (string-ascii 100))
                (certification-date uint)
                (certification-expiry uint))
  (let ((new-id (+ (var-get last-technician-id) u1)))
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (map-insert technicians
                { technician-id: new-id }
                {
                  name: name,
                  contact: contact,
                  certification-date: certification-date,
                  certification-expiry: certification-expiry,
                  status: "active"
                })
    (var-set last-technician-id new-id)
    (ok new-id)
  )
)

;; Add qualification for a technician
(define-public (add-qualification
                (technician-id uint)
                (device-type (string-ascii 50))
                (certification-level (string-ascii 20)))
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (asserts! (map-get? technicians { technician-id: technician-id }) (err u404))
    (ok (map-insert qualifications
                    { technician-id: technician-id, device-type: device-type }
                    {
                      certification-level: certification-level,
                      verified: false
                    }))
  )
)

;; Verify a technician's qualification
(define-public (verify-qualification (technician-id uint) (device-type (string-ascii 50)))
  (let ((qualification (unwrap! (map-get? qualifications { technician-id: technician-id, device-type: device-type }) (err u404))))
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (ok (map-set qualifications
                { technician-id: technician-id, device-type: device-type }
                (merge qualification { verified: true })))
  )
)

;; Update technician status
(define-public (update-technician-status (technician-id uint) (status (string-ascii 20)))
  (let ((technician (unwrap! (map-get? technicians { technician-id: technician-id }) (err u404))))
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (ok (map-set technicians
                { technician-id: technician-id }
                (merge technician { status: status })))
  )
)

;; Check if a technician is qualified for a specific device type
(define-read-only (is-qualified (technician-id uint) (device-type (string-ascii 50)))
  (match (map-get? qualifications { technician-id: technician-id, device-type: device-type })
    qualification (and (get verified qualification)
                       (match (map-get? technicians { technician-id: technician-id })
                         technician (is-eq (get status technician) "active")
                         false))
    false)
)

;; Get technician details
(define-read-only (get-technician (technician-id uint))
  (map-get? technicians { technician-id: technician-id })
)

;; Get qualification details
(define-read-only (get-qualification (technician-id uint) (device-type (string-ascii 50)))
  (map-get? qualifications { technician-id: technician-id, device-type: device-type })
)

;; Contract owner
(define-data-var contract-owner principal tx-sender)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (ok (var-set contract-owner new-owner))
  )
)
