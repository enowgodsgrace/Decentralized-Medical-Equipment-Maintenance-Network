;; Service Scheduling Contract
;; Manages regular maintenance appointments

(define-data-var last-service-id uint u0)

;; Define the service structure
(define-map services
  { service-id: uint }
  {
    device-id: uint,
    technician-id: uint,
    scheduled-date: uint,
    service-type: (string-ascii 50),
    status: (string-ascii 20),
    notes: (string-ascii 200)
  }
)

;; Define service history
(define-map service-history
  { device-id: uint, service-id: uint }
  {
    completion-date: uint,
    findings: (string-ascii 200),
    parts-replaced: (list 10 (string-ascii 50)),
    next-service-date: uint
  }
)

;; Schedule a new service
(define-public (schedule-service
                (device-id uint)
                (technician-id uint)
                (scheduled-date uint)
                (service-type (string-ascii 50))
                (notes (string-ascii 200)))
  (let ((new-id (+ (var-get last-service-id) u1)))
    (asserts! (is-eq tx-sender contract-owner) (err u403))

    ;; Check if device exists (requires device-registration contract)
    (asserts! (contract-call? .device-registration get-device device-id) (err u404))

    ;; Check if technician is qualified (requires technician-verification contract)
    (asserts! (contract-call? .technician-verification get-technician technician-id) (err u404))

    (map-insert services
                { service-id: new-id }
                {
                  device-id: device-id,
                  technician-id: technician-id,
                  scheduled-date: scheduled-date,
                  service-type: service-type,
                  status: "scheduled",
                  notes: notes
                })
    (var-set last-service-id new-id)
    (ok new-id)
  )
)

;; Update service status
(define-public (update-service-status (service-id uint) (status (string-ascii 20)))
  (let ((service (unwrap! (map-get? services { service-id: service-id }) (err u404))))
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (ok (map-set services
                { service-id: service-id }
                (merge service { status: status })))
  )
)

;; Complete a service
(define-public (complete-service
                (service-id uint)
                (findings (string-ascii 200))
                (parts-replaced (list 10 (string-ascii 50)))
                (next-service-date uint))
  (let ((service (unwrap! (map-get? services { service-id: service-id }) (err u404))))
    (asserts! (is-eq tx-sender contract-owner) (err u403))
    (asserts! (is-eq (get status service) "in-progress") (err u400))

    ;; Update service status
    (map-set services
             { service-id: service-id }
             (merge service { status: "completed" }))

    ;; Record service history
    (map-insert service-history
                { device-id: (get device-id service), service-id: service-id }
                {
                  completion-date: block-height,
                  findings: findings,
                  parts-replaced: parts-replaced,
                  next-service-date: next-service-date
                })

    (ok true)
  )
)

;; Get service details
(define-read-only (get-service (service-id uint))
  (map-get? services { service-id: service-id })
)

;; Get service history for a device
(define-read-only (get-service-history (device-id uint) (service-id uint))
  (map-get? service-history { device-id: device-id, service-id: service-id })
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
