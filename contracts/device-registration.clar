;; Device Registration Contract
;; Records details of hospital equipment

;; Contract owner
(define-data-var contract-owner principal tx-sender)

(define-data-var last-device-id uint u0)

;; Define the device structure
(define-map devices
  { device-id: uint }
  {
    name: (string-ascii 100),
    model: (string-ascii 100),
    serial-number: (string-ascii 50),
    manufacturer: (string-ascii 100),
    purchase-date: uint,
    warranty-expiry: uint,
    hospital-id: uint,
    status: (string-ascii 20)
  }
)

;; Define hospitals that own devices
(define-map hospitals
  { hospital-id: uint }
  {
    name: (string-ascii 100),
    location: (string-ascii 100),
    contact: (string-ascii 100)
  }
)

;; Register a new hospital
(define-public (register-hospital
                (hospital-id uint)
                (name (string-ascii 100))
                (location (string-ascii 100))
                (contact (string-ascii 100)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (ok (map-insert hospitals
                    { hospital-id: hospital-id }
                    {
                      name: name,
                      location: location,
                      contact: contact
                    }))
  )
)

;; Register a new device
(define-public (register-device
                (name (string-ascii 100))
                (model (string-ascii 100))
                (serial-number (string-ascii 50))
                (manufacturer (string-ascii 100))
                (purchase-date uint)
                (warranty-expiry uint)
                (hospital-id uint))
  (let ((new-id (+ (var-get last-device-id) u1)))
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (asserts! (is-some (map-get? hospitals { hospital-id: hospital-id })) (err u404))
    (map-insert devices
                { device-id: new-id }
                {
                  name: name,
                  model: model,
                  serial-number: serial-number,
                  manufacturer: manufacturer,
                  purchase-date: purchase-date,
                  warranty-expiry: warranty-expiry,
                  hospital-id: hospital-id,
                  status: "active"
                })
    (var-set last-device-id new-id)
    (ok new-id)
  )
)

;; Update device status
(define-public (update-device-status (device-id uint) (status (string-ascii 20)))
  (let ((device (unwrap! (map-get? devices { device-id: device-id }) (err u404))))
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (ok (map-set devices
                { device-id: device-id }
                (merge device { status: status })))
  )
)

;; Get device details
(define-read-only (get-device (device-id uint))
  (map-get? devices { device-id: device-id })
)

;; Get hospital details
(define-read-only (get-hospital (hospital-id uint))
  (map-get? hospitals { hospital-id: hospital-id })
)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (ok (var-set contract-owner new-owner))
  )
)

